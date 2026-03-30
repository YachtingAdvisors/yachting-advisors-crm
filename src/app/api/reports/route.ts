import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const clientId = params.get('client_id');
  const period = params.get('period') || '30d';

  let allowedClientIds: string[] | null = null;
  if (!isAdmin(user.email)) {
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', user.id);
    allowedClientIds = (userClients || []).map((uc: any) => uc.client_id);
    if (allowedClientIds.length === 0) {
      return NextResponse.json({ kpis: {}, lead_sources: [], pipeline_by_stage: [], recent_activities: [] });
    }
  }

  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
  const days = daysMap[period] || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const clientFilter = clientId
    ? { column: 'client_id', value: clientId }
    : allowedClientIds
      ? { column: 'client_id', value: allowedClientIds }
      : null;

  // KPIs
  let leadsQuery = supabase.from('leads').select('id', { count: 'exact', head: true });
  if (clientFilter) {
    leadsQuery = Array.isArray(clientFilter.value)
      ? leadsQuery.in(clientFilter.column, clientFilter.value)
      : leadsQuery.eq(clientFilter.column, clientFilter.value);
  }
  const { count: totalLeads } = await leadsQuery;

  let newLeadsQuery = supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', sinceStr);
  if (clientFilter) {
    newLeadsQuery = Array.isArray(clientFilter.value)
      ? newLeadsQuery.in(clientFilter.column, clientFilter.value)
      : newLeadsQuery.eq(clientFilter.column, clientFilter.value);
  }
  const { count: newLeads } = await newLeadsQuery;

  let contactsQuery = supabase.from('contacts').select('id', { count: 'exact', head: true });
  if (clientFilter) {
    contactsQuery = Array.isArray(clientFilter.value)
      ? contactsQuery.in(clientFilter.column, clientFilter.value)
      : contactsQuery.eq(clientFilter.column, clientFilter.value);
  }
  const { count: totalContacts } = await contactsQuery;

  let activeDealsQuery = supabase.from('deals').select('id, value').not('deal_stages.is_won', 'is', true).not('deal_stages.is_lost', 'is', true);
  if (clientFilter) {
    activeDealsQuery = Array.isArray(clientFilter.value)
      ? activeDealsQuery.in(clientFilter.column, clientFilter.value)
      : activeDealsQuery.eq(clientFilter.column, clientFilter.value);
  }

  // Simpler approach: get all deals and compute
  let allDealsQuery = supabase.from('deals').select('value, deal_stages(is_won, is_lost)');
  if (clientFilter) {
    allDealsQuery = Array.isArray(clientFilter.value)
      ? allDealsQuery.in('client_id', clientFilter.value as string[])
      : allDealsQuery.eq('client_id', clientFilter.value);
  }
  const { data: allDeals } = await allDealsQuery;

  const activeDeals = (allDeals || []).filter((d: any) => !d.deal_stages?.is_won && !d.deal_stages?.is_lost);
  const wonDeals = (allDeals || []).filter((d: any) => d.deal_stages?.is_won);
  const pipelineValue = activeDeals.reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0);
  const wonValue = wonDeals.reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0);

  let overdueQuery = supabase.from('tasks').select('id', { count: 'exact', head: true })
    .eq('completed', false).lt('due_date', new Date().toISOString()).not('due_date', 'is', null);
  if (clientFilter) {
    overdueQuery = Array.isArray(clientFilter.value)
      ? overdueQuery.in(clientFilter.column, clientFilter.value)
      : overdueQuery.eq(clientFilter.column, clientFilter.value);
  }
  const { count: overdueTasks } = await overdueQuery;

  // Lead sources
  let sourcesQuery = supabase.from('leads').select('source');
  if (clientFilter) {
    sourcesQuery = Array.isArray(clientFilter.value)
      ? sourcesQuery.in('client_id', clientFilter.value as string[])
      : sourcesQuery.eq('client_id', clientFilter.value);
  }
  const { data: sourceData } = await sourcesQuery;
  const sourceCounts: Record<string, number> = {};
  (sourceData || []).forEach((l: any) => {
    sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
  });
  const lead_sources = Object.entries(sourceCounts).map(([source, count]) => ({ source, count }));

  // Pipeline by stage
  let stagesQuery = supabase.from('deal_stages').select('id, name, color');
  if (clientFilter) {
    stagesQuery = Array.isArray(clientFilter.value)
      ? stagesQuery.in('client_id', clientFilter.value as string[])
      : stagesQuery.eq('client_id', clientFilter.value);
  }
  const { data: stages } = await stagesQuery.order('position');

  const pipeline_by_stage = (stages || []).map((stage: any) => {
    const stageDeals = (allDeals || []).filter((d: any) => d.deal_stages && !d.deal_stages.is_won && !d.deal_stages.is_lost);
    return {
      stage: stage.name,
      color: stage.color,
      count: stageDeals.length,
      value: stageDeals.reduce((s: number, d: any) => s + (Number(d.value) || 0), 0),
    };
  });

  // Recent activities
  let activitiesQuery = supabase.from('activities')
    .select('*, contacts(first_name, last_name), deals(title)')
    .order('created_at', { ascending: false })
    .limit(10);
  if (clientFilter) {
    activitiesQuery = Array.isArray(clientFilter.value)
      ? activitiesQuery.in('client_id', clientFilter.value as string[])
      : activitiesQuery.eq('client_id', clientFilter.value);
  }
  const { data: recent_activities } = await activitiesQuery;

  return NextResponse.json({
    kpis: {
      total_leads: totalLeads || 0,
      new_leads_period: newLeads || 0,
      total_contacts: totalContacts || 0,
      active_deals: activeDeals.length,
      pipeline_value: pipelineValue,
      deals_won: wonDeals.length,
      deals_won_value: wonValue,
      overdue_tasks: overdueTasks || 0,
    },
    lead_sources,
    pipeline_by_stage,
    recent_activities: recent_activities || [],
  });
}
