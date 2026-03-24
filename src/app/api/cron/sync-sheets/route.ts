import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { SHEET_CONFIGS, syncSheet } from '@/lib/sheets-sync';
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
  const results: Record<string, any> = {};

  for (const config of SHEET_CONFIGS) {
    try {
      // Get existing lead IDs for this client to detect truly new ones
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', config.clientName)
        .maybeSingle();

      let existingIds = new Set<string>();
      if (client) {
        const { data: existing } = await supabase
          .from('leads')
          .select('meta_lead_id')
          .eq('client_id', client.id);
        existingIds = new Set((existing || []).map((l: any) => l.meta_lead_id));
      }

      const result = await syncSheet(supabase, config);
      results[config.clientName] = result;

      // Send notifications for truly new leads (not previously in DB)
      if (client && result.synced > 0) {
        const { data: newLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('client_id', client.id)
          .eq('status', 'New')
          .order('created_at', { ascending: false })
          .limit(result.synced);

        const { data: fullClient } = await supabase
          .from('clients')
          .select('*')
          .eq('id', client.id)
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
      console.error(`[Cron] Failed to sync ${config.clientName}:`, err);
      results[config.clientName] = { error: err.message };
    }
  }

  return NextResponse.json({ success: true, results });
}
