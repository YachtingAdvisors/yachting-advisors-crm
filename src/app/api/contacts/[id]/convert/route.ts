import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { lead_id } = body;

  if (!lead_id) {
    return NextResponse.json({ error: 'lead_id required' }, { status: 400 });
  }

  // Get the lead
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  // Split name into first/last
  const nameParts = (lead.name || '').trim().split(' ');
  const first_name = nameParts[0] || 'Unknown';
  const last_name = nameParts.slice(1).join(' ') || null;

  // Create contact from lead
  const { data: contact, error: contactErr } = await supabase
    .from('contacts')
    .insert({
      client_id: lead.client_id,
      first_name,
      last_name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      lead_id: lead.id,
    })
    .select()
    .single();

  if (contactErr) {
    return NextResponse.json({ error: contactErr.message }, { status: 500 });
  }

  // Link lead back to contact
  await supabase.from('leads').update({ contact_id: contact.id }).eq('id', lead.id);

  // Log activity
  await supabase.from('activities').insert({
    client_id: lead.client_id,
    type: 'status_change',
    title: 'Lead converted to contact',
    description: `${lead.name} was converted from a lead to a contact`,
    contact_id: contact.id,
    lead_id: lead.id,
    user_id: user.id,
    user_email: user.email,
  });

  return NextResponse.json({ contact }, { status: 201 });
}
