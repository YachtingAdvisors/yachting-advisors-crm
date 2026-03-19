export type LeadStatus = 'New' | 'Qualified' | 'Converted' | 'Inactive';
export type LeadSource = 'Meta' | 'Instagram' | 'Website';

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

export const ADMIN_EMAILS = [
  'shawn@yachtingadvisors.com',
  'josh@yachtingadvisors.com',
];

export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
