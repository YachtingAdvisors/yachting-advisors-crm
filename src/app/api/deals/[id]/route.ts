import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('deals')
    .select('*, deal_stages(name, color, is_won, is_lost), contacts(first_name, last_name, email, phone)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ deal: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Get current deal for stage change detection
  const { data: current } = await supabase.from('deals').select('*, deal_stages(name)').eq('id', id).single();

  const allowedFields = ['title', 'value', 'stage_id', 'contact_id', 'expected_close_date', 'description', 'position', 'custom_fields', 'assigned_to'];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .select('*, deal_stages(name, color, is_won, is_lost), contacts(first_name, last_name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log stage change
  if (body.stage_id && current && body.stage_id !== current.stage_id) {
    await supabase.from('activities').insert({
      client_id: data.client_id,
      type: 'stage_change',
      title: `Deal moved to ${data.deal_stages?.name}`,
      description: `"${data.title}" moved from ${current.deal_stages?.name} to ${data.deal_stages?.name}`,
      deal_id: id,
      contact_id: data.contact_id,
      user_id: user.id,
      user_email: user.email,
      metadata: { from_stage: current.stage_id, to_stage: body.stage_id },
    });
  }

  return NextResponse.json({ deal: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('deals').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
