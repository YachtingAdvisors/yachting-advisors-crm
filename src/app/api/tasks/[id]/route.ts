import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const allowedFields = ['title', 'description', 'due_date', 'priority', 'completed', 'contact_id', 'deal_id'];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  // Set completed_at when completing
  if (body.completed === true) {
    updates.completed_at = new Date().toISOString();
  } else if (body.completed === false) {
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select('*, contacts(first_name, last_name), deals(title)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log completion activity
  if (body.completed === true) {
    await supabase.from('activities').insert({
      client_id: data.client_id,
      type: 'task',
      title: 'Task completed',
      description: `"${data.title}" was completed`,
      contact_id: data.contact_id,
      deal_id: data.deal_id,
      user_id: user.id,
      user_email: user.email,
    });
  }

  return NextResponse.json({ task: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
