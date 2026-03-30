'use client';

import { useEffect, useState } from 'react';
import { useClient } from '@/contexts/client-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartTooltip, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const COLORS = ['#D4AF37', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const tooltipStyle = {
  contentStyle: { background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#E5E7EB' },
};

export default function ReportsPage() {
  const { clientId, loading } = useClient();
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState('30d');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !clientId) return;
    setFetching(true);
    fetch(`/api/reports?client_id=${clientId}&period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setFetching(false));
  }, [clientId, period, loading]);

  if (loading || fetching) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 rounded bg-card" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-xl bg-card" />)}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const leadSources = data?.lead_sources || [];
  const pipelineByStage = data?.pipeline_by_stage || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Analytics and performance metrics</p>
        </div>
        <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: kpis.total_leads },
          { label: 'Total Contacts', value: kpis.total_contacts },
          { label: 'Active Deals', value: kpis.active_deals },
          { label: 'Pipeline Value', value: formatCurrency(kpis.pipeline_value) },
        ].map((item) => (
          <Card key={item.label} className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.value ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Sources Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {leadSources.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={leadSources}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    strokeWidth={0}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {leadSources.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartTooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pipeline by Stage */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineByStage.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No pipeline data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pipelineByStage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis type="number" stroke="#6B7280" />
                  <YAxis dataKey="stage" type="category" width={100} stroke="#6B7280" fontSize={12} />
                  <RechartTooltip {...tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {pipelineByStage.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Leads', value: kpis.total_leads || 0, color: '#6366F1' },
                { label: 'Contacts', value: kpis.total_contacts || 0, color: '#D4AF37' },
                { label: 'Active Deals', value: kpis.active_deals || 0, color: '#F59E0B' },
                { label: 'Won Deals', value: kpis.deals_won || 0, color: '#10B981' },
              ].map((step, i) => {
                const maxVal = Math.max(kpis.total_leads || 1, 1);
                const width = Math.max((step.value / maxVal) * 100, 5);
                return (
                  <div key={step.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{step.label}</span>
                      <span className="font-medium">{step.value}</span>
                    </div>
                    <div className="h-6 rounded-md bg-card overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{ width: `${width}%`, background: step.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Deal Performance */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Deal Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Deals Won</span>
                <span className="font-semibold text-emerald-400">{kpis.deals_won || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Won Value</span>
                <span className="font-semibold gold-text">{formatCurrency(kpis.deals_won_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Pipeline Value</span>
                <span className="font-semibold">{formatCurrency(kpis.pipeline_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Overdue Tasks</span>
                <span className={`font-semibold ${(kpis.overdue_tasks || 0) > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {kpis.overdue_tasks || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
