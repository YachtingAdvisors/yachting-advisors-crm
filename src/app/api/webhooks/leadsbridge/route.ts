import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendLeadNotification } from '@/lib/notifications';

// POST — LeadsBridge sends parsed lead data here
export async function POST(req: NextRequest) {
  // Validate access secret
  const secret = process.env.LEADSBRIDGE_SECRET;
  const providedSecret =
    req.headers.get('x-access-secret') ||
    req.nextUrl.searchParams.get('secret');

  if (secret && providedSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up client by name from query param
  const clientName = req.nextUrl.searchParams.get('client');
  if (!clientName) {
    return NextResponse.json({ error: 'Missing ?client= query parameter' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', clientName)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: `Client "${clientName}" not found` }, { status: 404 });
  }

  // Parse LeadsBridge payload — accepts common field names
  const body = await req.json();
  console.log('[LeadsBridge] Received payload:', JSON.stringify(body).slice(0, 500));

  const name =
    body.full_name ||
    body.name ||
    [body.first_name, body.last_name].filter(Boolean).join(' ') ||
    'Unknown';
  const email = body.email || null;
  const phone = body.phone_number || body.phone || null;
  const campaign = body.campaign_name || body.campaign || null;
  const adName = body.ad_name || body.ad || null;
  const formName = body.form_name || null;

  // Build form responses from all fields
  const formResponses: Array<{ question: string; answer: string }> = [];
  const knownKeys = new Set([
    'full_name', 'name', 'first_name', 'last_name',
    'email', 'phone_number', 'phone',
    'campaign_name', 'campaign', 'ad_name', 'ad',
    'form_name', 'lead_id', 'platform', 'id',
  ]);
  for (const [key, value] of Object.entries(body)) {
    if (value && typeof value === 'string' && !knownKeys.has(key)) {
      formResponses.push({ question: key, answer: value });
    }
  }

  // Generate a unique lead ID (LeadsBridge may or may not include one)
  const metaLeadId = body.lead_id || body.id || `lb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { error: upsertError } = await supabase.from('leads').upsert(
    {
      meta_lead_id: String(metaLeadId),
      client_id: client.id,
      name,
      email,
      phone,
      source: 'Meta',
      campaign,
      ad_name: adName,
      form_name: formName,
      form_responses: formResponses,
      status: 'New',
    },
    { onConflict: 'meta_lead_id' }
  );

  if (upsertError) {
    console.error('[LeadsBridge] DB upsert failed:', upsertError);
    return NextResponse.json({ error: 'Database insert failed' }, { status: 500 });
  }

  // Send email + SMS notifications
  await sendLeadNotification(supabase, client, {
    name,
    email,
    phone,
    campaign,
    adName,
    formResponses,
  });

  return NextResponse.json({ success: true, lead: { name, email, phone } });
}
