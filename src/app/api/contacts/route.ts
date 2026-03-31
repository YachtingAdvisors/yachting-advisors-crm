import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export interface UnifiedContact {
  name: string;
  email: string | null;
  phone: string | null;
  type: 'lead' | 'deal' | 'both';
  lead_status: string | null;
  deal_stage: string | null;
  deal_count: number;
  last_activity: string;
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const search = params.get('search');

  // Determine which client IDs this user can access
  let allowedClientIds: string[] | null = null;
  if (!isAdmin(user.email)) {
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', user.id);
    allowedClientIds = (userClients || []).map((uc: any) => uc.client_id);
    if (allowedClientIds.length === 0) {
      return NextResponse.json({ contacts: [], total: 0 });
    }
  }

  // Fetch leads
  let leadsQuery = supabase.from('leads').select('name, email, phone, status, source, created_at, updated_at, client_id');
  if (allowedClientIds) {
    leadsQuery = leadsQuery.in('client_id', allowedClientIds);
  }
  const { data: leads } = await leadsQuery;

  // Fetch deals
  let dealsQuery = supabase.from('deals').select('contact_name, contact_email, contact_phone, stage, created_at, updated_at, client_id');
  if (allowedClientIds) {
    dealsQuery = dealsQuery.in('client_id', allowedClientIds);
  }
  const { data: deals } = await dealsQuery;

  // Merge and deduplicate
  const contactMap = new Map<string, UnifiedContact>();

  function getKey(name: string, email: string | null): string {
    if (email) return `email:${email.toLowerCase()}`;
    return `name:${name.toLowerCase().trim()}`;
  }

  function laterDate(a: string, b: string): string {
    return new Date(a) > new Date(b) ? a : b;
  }

  // Process leads
  for (const lead of (leads || [])) {
    const key = getKey(lead.name, lead.email);
    const existing = contactMap.get(key);
    if (existing) {
      existing.lead_status = lead.status;
      if (existing.type === 'deal') existing.type = 'both';
      existing.last_activity = laterDate(existing.last_activity, lead.updated_at || lead.created_at);
      if (!existing.email && lead.email) existing.email = lead.email;
      if (!existing.phone && lead.phone) existing.phone = lead.phone;
    } else {
      contactMap.set(key, {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        type: 'lead',
        lead_status: lead.status,
        deal_stage: null,
        deal_count: 0,
        last_activity: lead.updated_at || lead.created_at,
      });
    }
  }

  // Process deals
  for (const deal of (deals || [])) {
    const key = getKey(deal.contact_name, deal.contact_email);
    const existing = contactMap.get(key);
    if (existing) {
      existing.deal_stage = deal.stage;
      existing.deal_count += 1;
      if (existing.type === 'lead') existing.type = 'both';
      else if (existing.type !== 'both') existing.type = 'deal';
      existing.last_activity = laterDate(existing.last_activity, deal.updated_at || deal.created_at);
      if (!existing.email && deal.contact_email) existing.email = deal.contact_email;
      if (!existing.phone && deal.contact_phone) existing.phone = deal.contact_phone;
    } else {
      contactMap.set(key, {
        name: deal.contact_name,
        email: deal.contact_email,
        phone: deal.contact_phone,
        type: 'deal',
        lead_status: null,
        deal_stage: deal.stage,
        deal_count: 1,
        last_activity: deal.updated_at || deal.created_at,
      });
    }
  }

  let contacts = Array.from(contactMap.values());

  // Filter by search
  if (search) {
    const s = search.toLowerCase();
    contacts = contacts.filter((c) =>
      c.name.toLowerCase().includes(s) ||
      (c.email && c.email.toLowerCase().includes(s)) ||
      (c.phone && c.phone.includes(s))
    );
  }

  // Sort by last_activity descending
  contacts.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

  return NextResponse.json({ contacts, total: contacts.length });
}
