export type LeadStatus = 'New' | 'Qualified' | 'Converted' | 'Inactive';
export type LeadSource = 'Meta' | 'Instagram' | 'Website';

// Real estate MLS deal stages
export type DealStage =
  | 'Prospecting'
  | 'Pre-Approval'
  | 'Showings'
  | 'Offer Submitted'
  | 'Under Contract'
  | 'Inspection'
  | 'Appraisal'
  | 'Closing'
  | 'Sold'
  | 'Lost';

export const DEAL_STAGES: DealStage[] = [
  'Prospecting',
  'Pre-Approval',
  'Showings',
  'Offer Submitted',
  'Under Contract',
  'Inspection',
  'Appraisal',
  'Closing',
  'Sold',
  'Lost',
];

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  Prospecting: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'Pre-Approval': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Showings: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'Offer Submitted': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Under Contract': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Inspection: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Appraisal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  Closing: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Sold: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export type PropertyType = 'Single Family' | 'Condo' | 'Townhouse' | 'Multi-Family' | 'Land' | 'Commercial';

export interface Deal {
  id: string;
  client_id: string;
  lead_id: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  property_address: string | null;
  property_type: PropertyType | null;
  mls_number: string | null;
  list_price: number | null;
  offer_price: number | null;
  sale_price: number | null;
  stage: DealStage;
  closing_date: string | null;
  agent_notes: string | null;
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
