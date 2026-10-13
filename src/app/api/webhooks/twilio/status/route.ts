import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createServiceClient } from '@/lib/supabase';

const TERMINAL_STATES = new Set(['delivered', 'failed', 'undelivered']);

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params = Object.fromEntries(form.entries()) as Record<string, string>;
  const signature = req.headers.get('x-twilio-signature') || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const valid = twilio.validateRequest(authToken, signature, req.url, params);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const providerMessageId = params.MessageSid;
  const providerStatus = params.MessageStatus;
  if (!providerMessageId || !providerStatus) return NextResponse.json({ received: true });
  const state = providerStatus === 'delivered'
    ? 'delivered'
    : TERMINAL_STATES.has(providerStatus) ? 'failed' : 'accepted';
  const serviceClient = createServiceClient();
  await serviceClient.from('notification_deliveries')
    .update({ state, provider_status: providerStatus, delivered_at: state === 'delivered' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('provider_message_id', providerMessageId);
  return NextResponse.json({ received: true });
}
