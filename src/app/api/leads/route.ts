import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const status = params.get('status');
  const search = params.get('search');
  const clientId = params.get('client_id');
  const sort = params.get('sort') || 'created_at';
  const order = params.get('order') || 'desc';
  const limit = parseInt(params.get('limit') || '50', 10);
  const offset = parseInt(params.get('offset') || '0', 10);

  // Determine which client IDs this user can access
  let allowedClientIds: string[] | null = null;
  if (!isAdmin(user.email)) {
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', user.id);
    allowedClientIds = (userClients || []).map((uc: any) => uc.client_id);
    if (allowedClientIds.length === 0) {
      return NextResponse.json({ leads: [], total: 0 });
    }
  }

  let query = supabase
    .from('leads')
    .select('*, clients(name)', { count: 'exact' });

  // Filter by allowed clients
  if (allowedClientIds) {
    query = query.in('client_id', allowedClientIds);
  }

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  if (status && status !== 'All') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,campaign.ilike.%${search}%`
    );
  }

  const ascending = order === 'asc';
  query = query.order(sort, { ascending }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [], total: count || 0 });
}
