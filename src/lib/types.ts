// ─── Lead Types ───────────────────────────────────────────────
export type LeadStatus = 'New' | 'Qualified' | 'Converted' | 'Inactive';
export type LeadSource = 'Meta' | 'Instagram' | 'Website';

export interface Lead {
  id: string;
  meta_lead_id: string;
  client_id: string;
  contact_id: string | null;
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
  clients?: { name: string };
}

// ─── Client Types ─────────────────────────────────────────────
export type ClientType = 'yacht_broker' | 'realtor' | 'property_manager' | 'luxury_auto' | 'other';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  industry: string;
  meta_page_id: string;
  meta_access_token: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

// ─── Contact Types ────────────────────────────────────────────
export type ContactType = 'individual' | 'company';

export interface Contact {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  type: ContactType;
  tags: string[];
  source: string | null;
  lead_id: string | null;
  custom_fields: Record<string, unknown>;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string };
}

// ─── Deal Types ───────────────────────────────────────────────
export interface DealStage {
  id: string;
  client_id: string;
  name: string;
  position: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
}

export interface Deal {
  id: string;
  client_id: string;
  contact_id: string | null;
  lead_id: string | null;
  stage_id: string;
  title: string;
  value: number | null;
  currency: string;
  expected_close_date: string | null;
  description: string | null;
  assigned_to: string | null;
  position: number;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deal_stages?: DealStage;
  contacts?: Contact;
}

// ─── Activity Types ───────────────────────────────────────────
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'stage_change' | 'status_change';

export interface Activity {
  id: string;
  client_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  contact_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  user_id: string | null;
  user_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  contacts?: { first_name: string; last_name: string | null };
  deals?: { title: string };
}

// ─── Task Types ───────────────────────────────────────────────
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  completed: boolean;
  completed_at: string | null;
  assigned_to: string | null;
  assigned_email: string | null;
  contact_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
  contacts?: { first_name: string; last_name: string | null };
  deals?: { title: string };
}

// ─── User & Auth Types ────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────
export function getContactDisplayName(contact: { first_name: string; last_name: string | null }): string {
  return [contact.first_name, contact.last_name].filter(Boolean).join(' ');
}
