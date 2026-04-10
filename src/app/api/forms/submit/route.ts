import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendLeadNotification } from '@/lib/notifications';
import { FormField } from '@/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// In-memory rate limiting: IP -> array of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60_000; // 60 seconds

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  // Remove expired entries
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: { form_id?: string; fields?: Record<string, string>; hp?: string; ts?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const { form_id, fields, hp, ts } = body;

  // Honeypot check — silently succeed but don't create lead
  if (hp && hp.length > 0) {
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  }

  // Timestamp validation
  if (!ts || typeof ts !== 'number') {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400, headers: corsHeaders });
  }
  const now = Date.now();
  if (now - ts < 2000 || ts > now || ts < now - 3_600_000) {
    return NextResponse.json({ error: 'Invalid submission timing' }, { status: 400, headers: corsHeaders });
  }

  if (!form_id || !fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'form_id and fields are required' }, { status: 400, headers: corsHeaders });
  }

  const supabase = createServiceClient();

  // Look up form
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('*')
    .eq('id', form_id)
    .maybeSingle();

  if (formError || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404, headers: corsHeaders });
  }

  if (!form.enabled) {
    return NextResponse.json({ error: 'Form is disabled' }, { status: 404, headers: corsHeaders });
  }

  // Look up client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', form.client_id)
    .maybeSingle();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 500, headers: corsHeaders });
  }

  // Validate required fields
  const formFields = form.fields as FormField[];
  for (const ff of formFields) {
    if (ff.required && (!fields[ff.name] || fields[ff.name].trim() === '')) {
      return NextResponse.json(
        { error: `Field "${ff.label}" is required` },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  // Extract standard fields
  const name = fields.full_name || fields.name || 'Unknown';
  const email = fields.email || null;
  const phone = fields.phone || fields.phone_number || null;

  // Build form_responses from remaining fields
  const knownKeys = new Set(['full_name', 'name', 'email', 'phone', 'phone_number']);
  const formResponses: Array<{ question: string; answer: string }> = [];
  for (const ff of formFields) {
    if (!knownKeys.has(ff.name) && fields[ff.name]) {
      formResponses.push({ question: ff.label, answer: fields[ff.name] });
    }
  }

  // Generate unique lead ID
  const metaLeadId = `form_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Insert lead
  const { error: insertError } = await supabase.from('leads').insert({
    meta_lead_id: metaLeadId,
    client_id: client.id,
    name,
    email,
    phone,
    source: 'Website',
    campaign: null,
    ad_name: null,
    form_name: form.form_name,
    form_responses: formResponses,
    status: 'New',
  });

  if (insertError) {
    console.error('[FormSubmit] DB insert failed:', insertError);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500, headers: corsHeaders });
  }

  // Send notifications
  await sendLeadNotification(supabase, client, {
    name,
    email,
    phone,
    campaign: null,
    adName: null,
    formResponses,
  });

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}
