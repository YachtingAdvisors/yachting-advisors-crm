import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { isAdmin, DealStage, DEAL_STAGES } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const clientId = params.get('client_id');

  // Determine which client IDs this user can access
  let allowedClientIds: string[] | null = null;
  if (!isAdmin(user.email)) {
    const { data: userClients } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', user.id);
    allowedClientIds = (userClients || []).map((uc: any) => uc.client_id);
    if (allowedClientIds.length === 0) {
      return NextResponse.json({ analytics: emptyAnalytics() });
    }
  }

  // Fetch all leads
  let leadsQuery = supabase.from('leads').select('*');
  if (allowedClientIds) leadsQuery = leadsQuery.in('client_id', allowedClientIds);
  if (clientId) leadsQuery = leadsQuery.eq('client_id', clientId);
  const { data: leads } = await leadsQuery;
  const allLeads = leads || [];

  // Fetch all deals
  let dealsQuery = supabase.from('deals').select('*');
  if (allowedClientIds) dealsQuery = dealsQuery.in('client_id', allowedClientIds);
  if (clientId) dealsQuery = dealsQuery.eq('client_id', clientId);
  const { data: deals } = await dealsQuery;
  const allDeals = deals || [];

  // Lead status breakdown
  const leadsByStatus: Record<string, number> = { New: 0, Qualified: 0, Converted: 0, Inactive: 0 };
  for (const lead of allLeads) {
    if (lead.status in leadsByStatus) leadsByStatus[lead.status]++;
  }

  // Lead source breakdown
  const leadsBySource: Record<string, number> = { Meta: 0, Instagram: 0, Website: 0 };
  for (const lead of allLeads) {
    if (lead.source in leadsBySource) leadsBySource[lead.source]++;
  }

  // Deal stage breakdown
  const dealsByStage: Record<string, number> = {};
  for (const stage of DEAL_STAGES) dealsByStage[stage] = 0;
  for (const deal of allDeals) {
    if (deal.stage in dealsByStage) dealsByStage[deal.stage]++;
  }

  // Pipeline value: sum of list_price for active deals (not Sold, not Lost)
  const activeDeals = allDeals.filter((d: any) => d.stage !== 'Sold' && d.stage !== 'Lost');
  const pipelineValue = activeDeals.reduce((sum: number, d: any) => sum + (d.list_price || 0), 0);

  // Closed value: sum of sale_price for Sold deals
  const soldDeals = allDeals.filter((d: any) => d.stage === 'Sold');
  const closedValue = soldDeals.reduce((sum: number, d: any) => sum + (d.sale_price || 0), 0);

  // Conversion rate
  const totalLeads = allLeads.length;
  const convertedLeads = leadsByStatus['Converted'] || 0;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  // Average deal size (avg sale_price for Sold deals)
  const avgDealSize = soldDeals.length > 0
    ? soldDeals.reduce((sum: number, d: any) => sum + (d.sale_price || 0), 0) / soldDeals.length
    : 0;

  // Average days to close (closing_date - created_at for Sold deals)
  let avgDaysToClose = 0;
  const soldWithDates = soldDeals.filter((d: any) => d.closing_date && d.created_at);
  if (soldWithDates.length > 0) {
    const totalDays = soldWithDates.reduce((sum: number, d: any) => {
      const close = new Date(d.closing_date).getTime();
      const created = new Date(d.created_at).getTime();
      return sum + (close - created) / (1000 * 60 * 60 * 24);
    }, 0);
    avgDaysToClose = totalDays / soldWithDates.length;
  }

  // Month-over-month: this month vs last month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const leadsThisMonth = allLeads.filter((l: any) => new Date(l.created_at) >= thisMonthStart).length;
  const leadsLastMonth = allLeads.filter((l: any) => {
    const d = new Date(l.created_at);
    return d >= lastMonthStart && d < thisMonthStart;
  }).length;

  const dealsThisMonth = allDeals.filter((d: any) => new Date(d.created_at) >= thisMonthStart).length;
  const dealsLastMonth = allDeals.filter((d: any) => {
    const dt = new Date(d.created_at);
    return dt >= lastMonthStart && dt < thisMonthStart;
  }).length;

  // Top 5 active deals by list_price
  const topDeals = activeDeals
    .sort((a: any, b: any) => (b.list_price || 0) - (a.list_price || 0))
    .slice(0, 5)
    .map((d: any) => ({
      id: d.id,
      contact_name: d.contact_name,
      property_address: d.property_address,
      list_price: d.list_price,
      stage: d.stage as DealStage,
    }));

  return NextResponse.json({
    analytics: {
      totalLeads,
      leadsByStatus,
      leadsBySource,
      totalDeals: allDeals.length,
      dealsByStage,
      pipelineValue,
      closedValue,
      conversionRate,
      avgDealSize,
      avgDaysToClose,
      leadsThisMonth,
      leadsLastMonth,
      dealsThisMonth,
      dealsLastMonth,
      topDeals,
    },
  });
}

function emptyAnalytics() {
  return {
    totalLeads: 0,
    leadsByStatus: { New: 0, Qualified: 0, Converted: 0, Inactive: 0 },
    leadsBySource: { Meta: 0, Instagram: 0, Website: 0 },
    totalDeals: 0,
    dealsByStage: {},
    pipelineValue: 0,
    closedValue: 0,
    conversionRate: 0,
    avgDealSize: 0,
    avgDaysToClose: 0,
    leadsThisMonth: 0,
    leadsLastMonth: 0,
    dealsThisMonth: 0,
    dealsLastMonth: 0,
    topDeals: [],
  };
}
