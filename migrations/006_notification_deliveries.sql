CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'accepted', 'delivered', 'failed', 'unknown')),
  provider_message_id TEXT,
  provider_status TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lead_id, channel, recipient)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_lead ON notification_deliveries(lead_id);
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service manage notification_deliveries" ON notification_deliveries;
CREATE POLICY "Service manage notification_deliveries" ON notification_deliveries FOR ALL TO service_role USING (true);
