'use client';

import { useEffect, useState } from 'react';
import { useClient } from '@/contexts/client-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Handshake, TrendingUp, AlertTriangle, DollarSign, Target, UserPlus, Activity as ActivityIcon } from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = ['#D4AF37', '#6366F1', '#10B981', '#F59E0B', '#EF4444'];

export default function DashboardPage() {
  const { clientId, loading } = useClient();
  const [data, setData] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !clientId) return;
    setFetching(true);
    fetch(`/api/reports?client_id=${clientId}&period=30d`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setFetching(false));
  }, [clientId, loading]);

  if (loading || fetching) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 rounded-xl bg-card" />
          <div className="h-64 rounded-xl bg-card" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const leadSources = data?.lead_sources || [];
  const recentActivities = data?.recent_activities || [];

  const kpiCards = [
    { label: 'New Leads (30d)', value: kpis.new_leads_period, icon: UserPlus, color: 'text-blue-400' },
    { label: 'Active Deals', value: kpis.active_deals, sub: formatCurrency(kpis.pipeline_value), icon: Handshake, color: 'text-gold' },
    { label: 'Deals Won', value: kpis.deals_won, sub: formatCurrency(kpis.deals_won_value), icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Overdue Tasks', value: kpis.overdue_tasks, icon: AlertTriangle, color: kpis.overdue_tasks > 0 ? 'text-red-400' : 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your CRM activity</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="glass-card glass-card-hover transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value ?? 0}</p>
                  {kpi.sub && <p className="text-sm text-muted-foreground mt-0.5">{kpi.sub}</p>}
                </div>
                <div className={cn('p-3 rounded-xl bg-card', kpi.color)}>
                  <kpi.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Sources */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {leadSources.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No lead data yet</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={leadSources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={70} strokeWidth={0}>
                      {leadSources.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip
                      contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#E5E7EB' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {leadSources.map((s: any, i: number) => (
                    <div key={s.source} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{s.source}</span>
                      <span className="font-medium ml-auto">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto">
                {recentActivities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.title}</p>
                      {a.description && (
                        <p className="text-muted-foreground truncate text-xs">{a.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(a.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Add Contact', href: '/contacts', icon: UserPlus },
          { label: 'Create Deal', href: '/deals', icon: DollarSign },
          { label: 'Log Activity', href: '/activities', icon: ActivityIcon },
          { label: 'View Leads', href: '/leads', icon: Target },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="glass-card glass-card-hover transition-all cursor-pointer group">
              <CardContent className="pt-6 flex flex-col items-center gap-2 text-center">
                <action.icon className="w-6 h-6 text-muted-foreground group-hover:text-gold transition-colors" />
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
