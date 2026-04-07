import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/types';
import { sendLeadNotification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { client_id } = await req.json();
  if (!client_id) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Get client
  const { data: client } = await serviceClient
    .from('clients')
    .select('*')
    .eq('id', client_id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Get all leads for this client
  const { data: leads } = await serviceClient
    .from('leads')
    .select('*')
    .eq('client_id', client_id)
    .order('created_at', { ascending: false });

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: 'No leads found' }, { status: 404 });
  }

  let sent = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      await sendLeadNotification(serviceClient, client, {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        campaign: lead.campaign,
        adName: lead.ad_name,
        formResponses: lead.form_responses || [],
      });
      sent++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ sent, errors, total: leads.length });
}
