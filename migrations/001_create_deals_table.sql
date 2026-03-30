-- Create deals table for real estate MLS pipeline
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  property_address TEXT,
  property_type TEXT CHECK (property_type IN ('Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Commercial')),
  mls_number TEXT,
  list_price NUMERIC,
  offer_price NUMERIC,
  sale_price NUMERIC,
  stage TEXT NOT NULL DEFAULT 'Prospecting' CHECK (stage IN (
    'Prospecting', 'Pre-Approval', 'Showings', 'Offer Submitted',
    'Under Contract', 'Inspection', 'Appraisal', 'Closing', 'Sold', 'Lost'
  )),
  closing_date DATE,
  agent_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster client-based queries
CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deals_updated_at();

-- Enable realtime for deals table
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
