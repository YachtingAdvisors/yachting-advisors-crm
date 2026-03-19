import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchLeadById, fetchAdInfo, parseLeadFields } from '@/lib/meta';

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST — Meta sends lead notifications here
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServiceClient();

  // Get all clients to match page IDs to access tokens
  const { data: clients } = await supabase.from('clients').select('*');
  const clientMap = new Map(
    (clients || []).map((c: any) => [c.meta_page_id, c])
  );

  const entries = body.entry || [];
  for (const entry of entries) {
    const pageId = String(entry.id);
    const client = clientMap.get(pageId);
    if (!client) continue;

    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'leadgen') continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;

      try {
        const leadData = await fetchLeadById(leadgenId, client.meta_access_token);
        const { name, email, phone, formResponses } = parseLeadFields(leadData.field_data || []);

        let campaign: string | null = null;
        let adName: string | null = null;
        if (leadData.ad_id) {
          const adInfo = await fetchAdInfo(leadData.ad_id, client.meta_access_token);
          if (adInfo) {
            adName = adInfo.name || null;
            campaign = adInfo.campaign?.name || null;
          }
        }

        await supabase.from('leads').upsert(
          {
            meta_lead_id: leadData.id,
            client_id: client.id,
            name,
            email,
            phone,
            source: 'Meta',
            campaign,
            ad_name: adName,
            form_responses: formResponses,
            status: 'New',
          },
          { onConflict: 'meta_lead_id' }
        );
      } catch (err) {
        console.error(`[Webhook] Failed to process lead ${leadgenId}:`, err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
