import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isAdmin(user.email)) {
    const { data } = await supabase.from('clients').select('*').order('name');
    return NextResponse.json({ clients: data || [] });
  }

  // Non-admin: only return their assigned clients
  const { data: userClients } = await supabase
    .from('user_clients')
    .select('client_id, clients(*)')
    .eq('user_id', user.id);

  const clients = (userClients || []).map((uc: any) => uc.clients).filter(Boolean);
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, meta_page_id, meta_access_token } = body;
  if (!name || !meta_page_id || !meta_access_token) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({ name, meta_page_id, meta_access_token })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ client: data });
}
