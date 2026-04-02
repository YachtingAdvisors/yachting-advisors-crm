import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/types';

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('listing_feeds')
    .select('*');

  if (error) {
    // Table may not exist yet
    return NextResponse.json({ feeds: [], tableMissing: true });
  }

  return NextResponse.json({ feeds: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { feed_type, enabled, credentials } = body;

  if (!feed_type) {
    return NextResponse.json(
      { error: 'feed_type required' },
      { status: 400 },
    );
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('listing_feeds')
    .upsert(
      {
        feed_type,
        enabled: enabled ?? false,
        credentials: credentials || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'feed_type' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
