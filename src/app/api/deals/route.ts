import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const clientId = params.get('client_id');
  const stageId = params.get('stage_id');
  const contactId = params.get('contact_id');

  let allowedClientIds: string[] | null = null;
  if (!isAdmin(user.email)) {
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', user.id);
    allowedClientIds = (userClients || []).map((uc: any) => uc.client_id);
    if (allowedClientIds.length === 0) {
      return NextResponse.json({ deals: [], stages: [] });
    }
  }

  // Get stages
  let stagesQuery = supabase.from('deal_stages').select('*');
  if (clientId) stagesQuery = stagesQuery.eq('client_id', clientId);
  else if (allowedClientIds) stagesQuery = stagesQuery.in('client_id', allowedClientIds);
  const { data: stages } = await stagesQuery.order('position');

  // Get deals
  let query = supabase
    .from('deals')
    .select('*, deal_stages(name, color, is_won, is_lost), contacts(first_name, last_name, email)');

  if (allowedClientIds) query = query.in('client_id', allowedClientIds);
  if (clientId) query = query.eq('client_id', clientId);
  if (stageId) query = query.eq('stage_id', stageId);
  if (contactId) query = query.eq('contact_id', contactId);

  query = query.order('position');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deals: data || [], stages: stages || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, stage_id, title, value, contact_id, lead_id, expected_close_date, description } = body;

  if (!client_id || !stage_id || !title) {
    return NextResponse.json({ error: 'client_id, stage_id, and title required' }, { status: 400 });
  }

  // Get max position in the target stage
  const { data: maxPos } = await supabase
    .from('deals')
    .select('position')
    .eq('stage_id', stage_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = (maxPos?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('deals')
    .insert({
      client_id, stage_id, title, value, contact_id, lead_id,
      expected_close_date, description, position, assigned_to: user.id,
    })
    .select('*, deal_stages(name, color, is_won, is_lost), contacts(first_name, last_name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('activities').insert({
    client_id, type: 'note', title: 'Deal created',
    description: `Deal "${title}" was created`,
    deal_id: data.id, contact_id, user_id: user.id, user_email: user.email,
  });

  return NextResponse.json({ deal: data }, { status: 201 });
}
