-- ============================================
-- Yachting Advisors CRM — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Clients table (each linked Meta ad account / page)
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  meta_page_id TEXT NOT NULL,
  meta_access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-client access mapping (which users can see which clients)
CREATE TABLE user_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

CREATE INDEX idx_user_clients_user ON user_clients(user_id);
CREATE INDEX idx_user_clients_email ON user_clients(user_email);

-- Leads table
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_lead_id TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'Meta' CHECK (source IN ('Meta', 'Instagram', 'Website')),
  campaign TEXT,
  ad_name TEXT,
  form_name TEXT,
  form_responses JSONB DEFAULT '[]',
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Qualified', 'Converted', 'Inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_client ON leads(client_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_search ON leads USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, ''))
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clients ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read/write
-- (app-level logic handles client filtering based on user_clients mapping)
CREATE POLICY "Auth read leads" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert leads" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update leads" ON leads FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage clients" ON clients FOR ALL TO authenticated USING (true);

CREATE POLICY "Auth read user_clients" ON user_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage user_clients" ON user_clients FOR ALL TO authenticated USING (true);

-- Service role policies (for webhook inserts)
CREATE POLICY "Service insert leads" ON leads FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service read clients" ON clients FOR SELECT TO service_role USING (true);
