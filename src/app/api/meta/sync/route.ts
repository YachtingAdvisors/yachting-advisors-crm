import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/types';
import { fetchPageForms, fetchFormLeads, fetchAdInfo, parseLeadFields } from '@/lib/meta';

export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: clients } = await serviceClient.from('clients').select('*');
  if (!clients || clients.length === 0) {
    return NextResponse.json({ error: 'No clients configured' }, { status: 400 });
  }

  let synced = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      const forms = await fetchPageForms(client.meta_page_id, client.meta_access_token);

      for (const form of forms) {
        const leads = await fetchFormLeads(form.id, client.meta_access_token);

        for (const leadData of leads) {
          try {
            const { name, email, phone, formResponses } = parseLeadFields(leadData.field_data || []);

            let campaign: string | null = leadData.campaign_name || null;
            let adName: string | null = null;
            if (leadData.ad_id) {
              const adInfo = await fetchAdInfo(leadData.ad_id, client.meta_access_token);
              if (adInfo) {
                adName = adInfo.name || null;
                if (!campaign) campaign = adInfo.campaign?.name || null;
              }
            }

            await serviceClient.from('leads').upsert(
              {
                meta_lead_id: leadData.id,
                client_id: client.id,
                name,
                email,
                phone,
                source: 'Meta',
                campaign,
                ad_name: adName,
                form_name: form.name || null,
                form_responses: formResponses,
                status: 'New',
              },
              { onConflict: 'meta_lead_id', ignoreDuplicates: false }
            );
            synced++;
          } catch {
            errors++;
          }
        }
      }
    } catch (err) {
      console.error(`[Sync] Failed for client ${client.name}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ synced, errors });
}
