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
  const leadId = params.get('lead_id');
  const type = params.get('type');
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
      return NextResponse.json({ activities: [], total: 0 });
    }
  }

  let query = supabase
    .from('activities')
    .select('*, contacts(first_name, last_name), deals(title)', { count: 'exact' });

  if (allowedClientIds) query = query.in('client_id', allowedClientIds);
  if (clientId) query = query.eq('client_id', clientId);
  if (contactId) query = query.eq('contact_id', contactId);
  if (dealId) query = query.eq('deal_id', dealId);
  if (leadId) query = query.eq('lead_id', leadId);
  if (type) query = query.eq('type', type);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ activities: data || [], total: count || 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, type, title, description, contact_id, deal_id, lead_id, metadata } = body;

  if (!client_id || !type || !title) {
    return NextResponse.json({ error: 'client_id, type, and title required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('activities')
    .insert({
      client_id, type, title, description,
      contact_id, deal_id, lead_id,
      user_id: user.id, user_email: user.email,
      metadata: metadata || {},
    })
    .select('*, contacts(first_name, last_name), deals(title)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activity: data }, { status: 201 });
}
