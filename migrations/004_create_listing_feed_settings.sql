CREATE TABLE IF NOT EXISTS listing_feed_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  feed_type TEXT NOT NULL,
  api_key TEXT,
  api_token TEXT,
  company_id TEXT,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, feed_type)
);
