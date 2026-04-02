export type LeadStatus = 'New' | 'Qualified' | 'Converted' | 'Inactive';
export type LeadSource = 'Meta' | 'Instagram' | 'Website';

// Deal pipeline stages
export type DealStage =
  | 'Prospecting'
  | 'Discovery'
  | 'Proposal'
  | 'Negotiation'
  | 'Contract Sent'
  | 'Under Review'
  | 'Closing'
  | 'Won'
  | 'Lost';

export const DEAL_STAGES: DealStage[] = [
  'Prospecting',
  'Discovery',
  'Proposal',
  'Negotiation',
  'Contract Sent',
  'Under Review',
  'Closing',
  'Won',
  'Lost',
];

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  Prospecting: 'bg-slate-50 text-slate-700 border-slate-200',
  Discovery: 'bg-blue-50 text-blue-700 border-blue-200',
  Proposal: 'bg-violet-50 text-violet-700 border-violet-200',
  Negotiation: 'bg-amber-50 text-amber-700 border-amber-200',
  'Contract Sent': 'bg-orange-50 text-orange-700 border-orange-200',
  'Under Review': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Closing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Lost: 'bg-red-50 text-red-700 border-red-200',
};

export interface Deal {
  id: string;
  client_id: string;
  lead_id: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  list_price: number | null;
  offer_price: number | null;
  sale_price: number | null;
  stage: DealStage;
  closing_date: string | null;
  agent_notes: string | null;
  commission_rate: number | null;
  commission_amount: number | null;
  buyer_agent: string | null;
  listing_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  meta_lead_id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  campaign: string | null;
  ad_name: string | null;
  form_name: string | null;
  form_responses: Array<{ question: string; answer: string }>;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  meta_page_id: string;
  meta_access_token: string;
  created_at: string;
}

export interface UserClient {
  id: string;
  user_id: string;
  client_id: string;
  user_email: string;
}

export interface NotificationSettings {
  id: string;
  client_id: string;
  notification_emails: string[];
  notification_phones: string[];
  created_at: string;
  updated_at: string;
}

export const ADMIN_EMAILS = [
  'shawn@yachtingadvisors.com',
  'josh@yachtingadvisors.com',
];

export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Listing feed sources
export type ListingFeedType = 'boats_com' | 'yacht_broker' | 'yatco';

export interface Listing {
  id: string;
  source: ListingFeedType;
  name: string;
  make: string;
  model: string;
  year: number;
  price: number | null;
  currency: string;
  loa_feet: number | null;
  beam_feet: number | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  condition: string | null;
  status: string;
  category: string | null;
  hull_material: string | null;
  engine_count: number | null;
  engine_make: string | null;
  engine_hours: number | null;
  cabins: number | null;
  description: string | null;
  images: string[];
  broker_name: string | null;
  last_updated: string;
}

export interface ListingFeedSettings {
  id: string;
  client_id: string;
  feed_type: ListingFeedType;
  api_key: string | null;
  api_token: string | null;
  company_id: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
