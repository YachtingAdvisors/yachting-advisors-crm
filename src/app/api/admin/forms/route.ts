import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase';
import { isAdmin, FormField } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = req.nextUrl.searchParams.get('client_id');

  const serviceClient = createServiceClient();
  let query = serviceClient
    .from('forms')
    .select('*, clients(name)')
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ forms: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, client_id, form_name, fields, settings, enabled } = body;

  if (!client_id || !form_name) {
    return NextResponse.json({ error: 'client_id and form_name are required' }, { status: 400 });
  }

  // Validate fields array
  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: 'fields must be a non-empty array' }, { status: 400 });
  }

  const validFieldTypes = ['text', 'email', 'phone', 'textarea', 'select'];
  for (const field of fields as FormField[]) {
    if (!field.name || !field.label || !validFieldTypes.includes(field.type)) {
      return NextResponse.json(
        { error: `Invalid field: each field must have name, label, and a valid type (${validFieldTypes.join(', ')})` },
        { status: 400 }
      );
    }
  }

  const serviceClient = createServiceClient();

  const record: Record<string, unknown> = {
    client_id,
    form_name,
    fields,
    settings: settings || {},
    enabled: enabled !== undefined ? enabled : true,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    // Update existing form
    const { data, error } = await serviceClient
      .from('forms')
      .update(record)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ form: data });
  } else {
    // Create new form
    const { data, error } = await serviceClient
      .from('forms')
      .insert(record)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ form: data });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from('forms').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
