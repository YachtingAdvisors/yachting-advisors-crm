export type DeliveryChannel = 'email' | 'sms';
export type DeliveryState = 'pending' | 'accepted' | 'delivered' | 'failed' | 'unknown';

export interface DeliveryResult {
  channel: DeliveryChannel;
  recipient: string;
  state: DeliveryState | 'skipped';
  providerMessageId?: string;
  providerStatus?: string;
  error?: string;
}

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function parseRecipientConfig(raw: string | undefined, expectedCount: number): string[] | null {
  if (!raw) return null;
  const recipients = raw.split(',').map((value) => value.trim()).filter(Boolean);
  if (recipients.length !== expectedCount || new Set(recipients).size !== expectedCount) return null;
  if (recipients.some((recipient) => !E164_PATTERN.test(recipient))) return null;
  return recipients;
}

export function resolveSmsRecipients(
  clientName: string,
  configuredPhones: string[] = [],
  overrideRecipients?: string[],
  defaultRecipient?: string,
  fiveStarRecipients: string[] | null = null
): string[] {
  if (overrideRecipients) return [...new Set(overrideRecipients)];
  const defaults = clientName === 'Five Star Claims Adjusting' ? (fiveStarRecipients || []) : (defaultRecipient ? [defaultRecipient] : []);
  return [...new Set([...defaults, ...configuredPhones])];
}

export async function claimDelivery(supabase: any, leadId: string, channel: DeliveryChannel, recipient: string): Promise<boolean> {
  const { data: existing } = await supabase.from('notification_deliveries')
    .select('id, state, attempt_count')
    .eq('lead_id', leadId).eq('channel', channel).eq('recipient', recipient).maybeSingle();
  if (existing && ['pending', 'accepted', 'delivered', 'unknown'].includes(existing.state)) return false;
  if (existing?.state === 'failed') {
    const { data: claimed, error } = await supabase.from('notification_deliveries')
      .update({ state: 'pending', attempt_count: (existing.attempt_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', existing.id).eq('state', 'failed').select('id').maybeSingle();
    return !error && !!claimed;
  }
  const { error } = await supabase.from('notification_deliveries').insert({
    lead_id: leadId, channel, recipient, state: 'pending', attempt_count: 1, updated_at: new Date().toISOString(),
  });
  return !error;
}

export async function recordDelivery(supabase: any, leadId: string, result: DeliveryResult): Promise<void> {
  await supabase.from('notification_deliveries').upsert({
    lead_id: leadId,
    channel: result.channel,
    recipient: result.recipient,
    state: result.state === 'skipped' ? 'failed' : result.state,
    provider_message_id: result.providerMessageId || null,
    provider_status: result.providerStatus || null,
    error_message: result.error || null,
    delivered_at: result.state === 'delivered' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'lead_id,channel,recipient' });
}
