import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('deals')
    .select('*, clients(name)')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (!isAdmin(user.email)) {
    const { data: uc } = await supabase
      .from('user_clients')
      .select('id')
      .eq('user_id', user.id)
      .eq('client_id', data.client_id)
      .single();
    if (!uc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ deal: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  const fields = [
    'stage', 'contact_name', 'contact_email', 'contact_phone',
    'description',
    'list_price', 'offer_price', 'sale_price',
    'closing_date', 'agent_notes',
    'commission_rate', 'commission_amount', 'buyer_agent', 'listing_agent',
  ];
  for (const f of fields) {
    // Use hasOwnProperty so that explicitly-sent null values (e.g. clearing
    // closing_date or sale_price) are included in the update, while fields
    // that were simply omitted from the request body are not.
    if (Object.prototype.hasOwnProperty.call(body, f)) allowed[f] = body[f];
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('deals')
    .update(allowed)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deal: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
