import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const clientId = params.get('client_id');
  const contactId = params.get('contact_id');
  const dealId = params.get('deal_id');
  const due = params.get('due'); // today, overdue, upcoming, completed, all
  const limit = parseInt(params.get('limit') || '50', 10);
  const offset = parseInt(params.get('offset') || '0', 10);

  let allowedClientIds: string[] | null = null;
  if (!isAdmin(user.email)) {
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', user.id);
    allowedClientIds = (userClients || []).map((uc: any) => uc.client_id);
    if (allowedClientIds.length === 0) {
      return NextResponse.json({ tasks: [], total: 0 });
    }
  }

  let query = supabase
    .from('tasks')
    .select('*, contacts(first_name, last_name), deals(title)', { count: 'exact' });

  if (allowedClientIds) query = query.in('client_id', allowedClientIds);
  if (clientId) query = query.eq('client_id', clientId);
  if (contactId) query = query.eq('contact_id', contactId);
  if (dealId) query = query.eq('deal_id', dealId);

  const now = new Date().toISOString();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  if (due === 'today') {
    query = query.eq('completed', false).gte('due_date', todayStart.toISOString()).lte('due_date', todayEnd.toISOString());
  } else if (due === 'overdue') {
    query = query.eq('completed', false).lt('due_date', now).not('due_date', 'is', null);
  } else if (due === 'upcoming') {
    query = query.eq('completed', false).gt('due_date', todayEnd.toISOString());
  } else if (due === 'completed') {
    query = query.eq('completed', true);
  } else {
    // all - default, no filter
  }

  query = query.order('completed').order('due_date', { ascending: true, nullsFirst: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data || [], total: count || 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, title, description, due_date, priority, contact_id, deal_id, lead_id } = body;

  if (!client_id || !title) {
    return NextResponse.json({ error: 'client_id and title required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      client_id, title, description, due_date,
      priority: priority || 'medium',
      contact_id, deal_id, lead_id,
      assigned_to: user.id, assigned_email: user.email,
    })
    .select('*, contacts(first_name, last_name), deals(title)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data }, { status: 201 });
}
