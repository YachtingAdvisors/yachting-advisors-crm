import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchSheetConfigs, syncSheetByConfig } from '@/lib/sheets-sync';
import { sendLeadNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const configs = await fetchSheetConfigs(supabase);
  const results: Record<string, any> = {};

  for (const config of configs) {
    try {
      // Get existing lead IDs for this client to detect truly new ones
      let existingIds = new Set<string>();
      const { data: existing } = await supabase
        .from('leads')
        .select('meta_lead_id')
        .eq('client_id', config.clientId);
      existingIds = new Set((existing || []).map((l: any) => l.meta_lead_id));

      const result = await syncSheetByConfig(supabase, config);
      results[config.sourceName] = result;

      // Send notifications for truly new leads (not previously in DB)
      if (result.synced > 0) {
        const { data: newLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('client_id', config.clientId)
          .eq('status', 'New')
          .order('created_at', { ascending: false })
          .limit(result.synced);

        const { data: fullClient } = await supabase
          .from('clients')
          .select('*')
          .eq('id', config.clientId)
          .single();

        for (const lead of newLeads || []) {
          if (!existingIds.has(lead.meta_lead_id)) {
            await sendLeadNotification(supabase, fullClient, {
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              campaign: lead.campaign,
              adName: lead.ad_name,
              formResponses: lead.form_responses || [],
            });
          }
        }
      }
    } catch (err: any) {
      console.error(`[Cron] Failed to sync ${config.sourceName}:`, err);
      results[config.sourceName] = { error: err.message };
    }
  }

  return NextResponse.json({ success: true, results });
}
