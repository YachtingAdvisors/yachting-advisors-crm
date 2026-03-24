import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchLeadById, fetchAdInfo, parseLeadFields } from '@/lib/meta';
import { sendLeadNotification } from '@/lib/notifications';

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');
  const verifyToken = process.env.META_VERIFY_TOKEN;

  console.log('[Webhook Verify]', { mode, token, challenge, verifyToken: verifyToken?.slice(0, 4) + '...' });

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden', debug: { mode, hasToken: !!token, hasVerify: !!verifyToken } }, { status: 403 });
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

        let campaign: string | null = leadData.campaign_name || null;
        let adName: string | null = null;
        if (leadData.ad_id) {
          const adInfo = await fetchAdInfo(leadData.ad_id, client.meta_access_token);
          if (adInfo) {
            adName = adInfo.name || null;
            if (!campaign) campaign = adInfo.campaign?.name || null;
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

        // Send email + SMS notifications
        await sendLeadNotification(supabase, client, { name, email, phone, campaign, adName, formResponses });
      } catch (err) {
        console.error(`[Webhook] Failed to process lead ${leadgenId}:`, err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
