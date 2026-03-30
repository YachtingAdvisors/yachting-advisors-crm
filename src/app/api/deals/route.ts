import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const stage = params.get('stage');
  const search = params.get('search');
  const clientId = params.get('client_id');
  const sort = params.get('sort') || 'created_at';
  const order = params.get('order') || 'desc';

  let allowedClientIds: string[] | null = null;
  if (!isAdmin(user.email)) {
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', user.id);
    allowedClientIds = (userClients || []).map((uc: any) => uc.client_id);
    if (allowedClientIds.length === 0) {
      return NextResponse.json({ deals: [], total: 0 });
    }
  }

  let query = supabase
    .from('deals')
    .select('*, clients(name)', { count: 'exact' });

  if (allowedClientIds) {
    query = query.in('client_id', allowedClientIds);
  }
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  if (stage && stage !== 'All') {
    query = query.eq('stage', stage);
  }
  if (search) {
    query = query.or(
      `contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,property_address.ilike.%${search}%,mls_number.ilike.%${search}%`
    );
  }

  const ascending = order === 'asc';
  query = query.order(sort, { ascending });

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deals: data || [], total: count || 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const { data, error } = await supabase
    .from('deals')
    .insert({
      client_id: body.client_id,
      lead_id: body.lead_id || null,
      contact_name: body.contact_name,
      contact_email: body.contact_email || null,
      contact_phone: body.contact_phone || null,
      property_address: body.property_address || null,
      property_type: body.property_type || null,
      mls_number: body.mls_number || null,
      list_price: body.list_price || null,
      offer_price: body.offer_price || null,
      stage: body.stage || 'Prospecting',
      closing_date: body.closing_date || null,
      agent_notes: body.agent_notes || null,
      commission_rate: body.commission_rate != null ? body.commission_rate : null,
      commission_amount: body.commission_amount != null ? body.commission_amount : null,
      buyer_agent: body.buyer_agent || null,
      listing_agent: body.listing_agent || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deal: data });
}
