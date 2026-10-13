import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/types';
import { sendLeadNotification } from '@/lib/notifications';
import { parseRecipientConfig } from '@/lib/notification-delivery';

const FIVE_STAR_CLIENT = 'Five Star Claims Adjusting';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const leadEmails = Array.isArray(body.lead_emails) ? body.lead_emails : [];
  const recipients = parseRecipientConfig(process.env.FIVESTAR_SMS_RECIPIENTS, 3);
  if (leadEmails.length !== 2 || new Set(leadEmails).size !== 2) {
    return NextResponse.json({ error: 'Exactly two distinct lead_emails are required' }, { status: 400 });
  }
  if (!recipients) {
    return NextResponse.json({ error: 'The private Five Star recipient configuration must contain exactly three recipients' }, { status: 503 });
  }

  const serviceClient = createServiceClient();
  const { data: leads, error } = await serviceClient
    .from('leads')
    .select('*, clients!inner(*)')
    .in('email', leadEmails)
    .eq('source', 'Meta');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  type ResolvedLead = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    campaign: string | null;
    ad_name: string | null;
    form_responses: Array<{ question: string; answer: string }>;
    clients: { id: string; name: string };
  };
  const resolvedLeads = (leads || []) as ResolvedLead[];
  if (resolvedLeads.length !== 2 || resolvedLeads.some((lead) => lead.clients?.name !== FIVE_STAR_CLIENT)) {
    return NextResponse.json({ error: 'The exact two Meta leads were not uniquely resolved to Five Star' }, { status: 409 });
  }

  const results = [];
  for (const lead of resolvedLeads) {
    const delivery = await sendLeadNotification(serviceClient, lead.clients, {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      campaign: lead.campaign,
      adName: lead.ad_name,
      formResponses: lead.form_responses || [],
    }, { channels: ['sms'], recipients });
    results.push({ lead_id: lead.id, lead_email: lead.email, name: lead.name, deliveries: delivery });
  }
  return NextResponse.json({ client: FIVE_STAR_CLIENT, leads: results });
}
