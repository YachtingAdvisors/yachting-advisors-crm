import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get('client_id');

  let query = supabase.from('deal_stages').select('*');
  if (clientId) query = query.eq('client_id', clientId);
  query = query.order('position');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stages: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 });
  }

  const { client_id, name, color, is_won, is_lost } = await req.json();
  if (!client_id || !name) {
    return NextResponse.json({ error: 'client_id and name required' }, { status: 400 });
  }

  // Get max position
  const { data: maxPos } = await supabase
    .from('deal_stages')
    .select('position')
    .eq('client_id', client_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = (maxPos?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('deal_stages')
    .insert({ client_id, name, position, color: color || '#D4AF37', is_won: is_won || false, is_lost: is_lost || false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stage: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Check if deals exist in this stage
  const { count } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('stage_id', id);

  if (count && count > 0) {
    return NextResponse.json({ error: 'Cannot delete stage with active deals' }, { status: 400 });
  }

  const { error } = await supabase.from('deal_stages').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
