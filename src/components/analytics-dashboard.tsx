'use client';

import { useEffect, useState } from 'react';
import { DealStage, DEAL_STAGES, DEAL_STAGE_COLORS } from '@/lib/types';

interface TopDeal {
  id: string;
  contact_name: string;
  description: string | null;
  list_price: number | null;
  stage: DealStage;
}

interface AnalyticsData {
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  totalDeals: number;
  dealsByStage: Record<string, number>;
  pipelineValue: number;
  closedValue: number;
  conversionRate: number;
  avgDealSize: number;
  avgDaysToClose: number;
  leadsThisMonth: number;
  leadsLastMonth: number;
  dealsThisMonth: number;
  dealsLastMonth: number;
  topDeals: TopDeal[];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function DeltaArrow({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  if (delta === 0) return <span className="text-xs text-gray-500">—</span>;
  const isUp = delta > 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
      {isUp ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      )}
      {isUp ? '+' : ''}{delta}
    </span>
  );
}

const STAGE_BAR_COLORS: Record<string, string> = {
  Prospecting: 'bg-slate-500',
  Discovery: 'bg-blue-500',
  Proposal: 'bg-violet-500',
  Negotiation: 'bg-amber-500',
  'Contract Sent': 'bg-orange-500',
  'Under Review': 'bg-cyan-500',
  Closing: 'bg-indigo-500',
  Won: 'bg-emerald-500',
  Lost: 'bg-red-500',
};

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-500',
  Qualified: 'bg-amber-500',
  Converted: 'bg-emerald-500',
  Inactive: 'bg-gray-500',
};

export default function AnalyticsDashboard({ clientId }: { clientId: string | null }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = clientId ? `/api/analytics?client_id=${clientId}` : '/api/analytics';
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        setData(res.analytics);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Failed to load analytics data.</p>
      </div>
    );
  }

  const maxLeadStatus = Math.max(...Object.values(data.leadsByStatus), 1);
  const totalDealCount = Object.values(data.dealsByStage).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Pipeline Value" value={formatCurrency(data.pipelineValue)} subtext={`${data.totalDeals - (data.dealsByStage['Won'] || 0) - (data.dealsByStage['Lost'] || 0)} active deals`} />
        <MetricCard label="Closed Revenue" value={formatCurrency(data.closedValue)} subtext={`${data.dealsByStage['Won'] || 0} deals won`} />
        <MetricCard label="Conversion Rate" value={`${data.conversionRate.toFixed(1)}%`} subtext={`${data.leadsByStatus['Converted'] || 0} of ${data.totalLeads} leads`} />
        <MetricCard label="Avg Days to Close" value={data.avgDaysToClose > 0 ? `${Math.round(data.avgDaysToClose)}` : '—'} subtext={data.avgDealSize > 0 ? `Avg deal: ${formatCurrency(data.avgDealSize)}` : 'No closed deals yet'} />
      </div>

      {/* Lead Funnel + Deal Stage Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Funnel */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Lead Funnel</h3>
          <div className="space-y-3">
            {(['New', 'Qualified', 'Converted', 'Inactive'] as const).map((status) => {
              const count = data.leadsByStatus[status] || 0;
              const pct = maxLeadStatus > 0 ? (count / maxLeadStatus) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-sm text-[#33475b] w-20 text-right">{status}</span>
                  <div className="flex-1 h-7 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${STATUS_COLORS[status]} rounded transition-all duration-500`}
                      style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-10 text-right font-mono">{count}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-600 mt-3">{data.totalLeads} total leads</p>
        </div>

        {/* Deal Stage Distribution */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Deal Stages</h3>
          {totalDealCount > 0 ? (
            <>
              {/* Stacked bar */}
              <div className="h-8 flex rounded overflow-hidden mb-4">
                {DEAL_STAGES.map((stage) => {
                  const count = data.dealsByStage[stage] || 0;
                  if (count === 0) return null;
                  const pct = (count / totalDealCount) * 100;
                  return (
                    <div
                      key={stage}
                      className={`${STAGE_BAR_COLORS[stage]} h-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                      title={`${stage}: ${count}`}
                    />
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {DEAL_STAGES.map((stage) => {
                  const count = data.dealsByStage[stage] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={stage} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm ${STAGE_BAR_COLORS[stage]}`} />
                      <span className="text-xs text-gray-600">{stage}</span>
                      <span className="text-xs text-gray-400 font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No deals yet.</p>
          )}
          <p className="text-xs text-gray-600 mt-3">{data.totalDeals} total deals</p>
        </div>
      </div>

      {/* Lead Sources + Month over Month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Lead Sources</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['Meta', 'Instagram', 'Website'] as const).map((source) => {
              const count = data.leadsBySource[source] || 0;
              const pct = data.totalLeads > 0 ? ((count / data.totalLeads) * 100).toFixed(1) : '0.0';
              return (
                <div key={source} className="bg-[#f5f8fa] rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{source}</p>
                  <p className="text-xl font-semibold text-[#1a1a2e]">{count}</p>
                  <p className="text-xs text-gray-500">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Month over Month */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Month over Month</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#f5f8fa] rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2">Leads</p>
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-xs text-gray-400">This Month</p>
                  <p className="text-lg font-semibold text-[#1a1a2e]">{data.leadsThisMonth}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Last Month</p>
                  <p className="text-lg font-semibold text-gray-500">{data.leadsLastMonth}</p>
                </div>
                <div className="ml-auto">
                  <DeltaArrow current={data.leadsThisMonth} previous={data.leadsLastMonth} />
                </div>
              </div>
            </div>
            <div className="bg-[#f5f8fa] rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2">Deals</p>
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-xs text-gray-400">This Month</p>
                  <p className="text-lg font-semibold text-[#1a1a2e]">{data.dealsThisMonth}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Last Month</p>
                  <p className="text-lg font-semibold text-gray-500">{data.dealsLastMonth}</p>
                </div>
                <div className="ml-auto">
                  <DeltaArrow current={data.dealsThisMonth} previous={data.dealsLastMonth} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Deals */}
      {data.topDeals.length > 0 && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Top Active Deals</h3>
          <div className="divide-y divide-gray-200">
            {data.topDeals.map((deal) => (
              <div key={deal.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a2e] truncate">{deal.contact_name}</p>
                  {deal.description && (
                    <p className="text-xs text-gray-500 truncate">{deal.description}</p>
                  )}
                </div>
                <span className="text-sm font-mono text-[#33475b]">
                  {deal.list_price ? formatFullCurrency(deal.list_price) : '—'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${DEAL_STAGE_COLORS[deal.stage]}`}>
                  {deal.stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#1a1a2e]">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtext}</p>
    </div>
  );
}
