import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const search = params.get('search');
  const clientId = params.get('client_id');
  const type = params.get('type');
  const sort = params.get('sort') || 'created_at';
  const order = params.get('order') || 'desc';
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
      return NextResponse.json({ contacts: [], total: 0 });
    }
  }

  let query = supabase
    .from('contacts')
    .select('*, clients(name)', { count: 'exact' });

  if (allowedClientIds) query = query.in('client_id', allowedClientIds);
  if (clientId) query = query.eq('client_id', clientId);
  if (type) query = query.eq('type', type);
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  query = query.order(sort, { ascending: order === 'asc' }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contacts: data || [], total: count || 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, first_name, last_name, email, phone, company, job_title, type, tags, source, notes, custom_fields } = body;

  if (!client_id || !first_name) {
    return NextResponse.json({ error: 'client_id and first_name required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      client_id, first_name, last_name, email, phone, company, job_title,
      type: type || 'individual', tags: tags || [], source, notes,
      custom_fields: custom_fields || {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity
  await supabase.from('activities').insert({
    client_id,
    type: 'note',
    title: 'Contact created',
    description: `${first_name} ${last_name || ''} was added as a contact`,
    contact_id: data.id,
    user_id: user.id,
    user_email: user.email,
  });

  return NextResponse.json({ contact: data }, { status: 201 });
}
