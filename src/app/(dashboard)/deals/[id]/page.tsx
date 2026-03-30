'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, DollarSign, Calendar, User, Briefcase } from 'lucide-react';
import { type Deal, type Activity, type Task, type DealStage, getContactDisplayName } from '@/lib/types';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [dealRes, activitiesRes, tasksRes] = await Promise.all([
        fetch(`/api/deals/${id}`),
        fetch(`/api/activities?deal_id=${id}&limit=20`),
        fetch(`/api/tasks?deal_id=${id}`),
      ]);
      const dealData = await dealRes.json();
      const activitiesData = await activitiesRes.json();
      const tasksData = await tasksRes.json();

      setDeal(dealData.deal);
      setActivities(activitiesData.activities || []);
      setTasks(tasksData.tasks || []);

      if (dealData.deal?.client_id) {
        const stagesRes = await fetch(`/api/deal-stages?client_id=${dealData.deal.client_id}`);
        const stagesData = await stagesRes.json();
        setStages(stagesData.stages || []);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const updateStage = async (stageId: string) => {
    const res = await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage_id: stageId }),
    });
    if (res.ok) {
      const { deal: updated } = await res.json();
      setDeal(updated);
      toast.success(`Moved to ${updated.deal_stages?.name}`);
      // Refresh activities
      const actRes = await fetch(`/api/activities?deal_id=${id}&limit=20`);
      const actData = await actRes.json();
      setActivities(actData.activities || []);
    }
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-40 rounded-xl bg-card" /><div className="h-64 rounded-xl bg-card" /></div>;
  }

  if (!deal) {
    return <div className="text-center py-12 text-muted-foreground">Deal not found</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      {/* Deal Header */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{deal.title}</h1>
              {deal.contacts && (
                <Link href={`/contacts/${deal.contact_id}`} className="text-muted-foreground text-sm hover:text-gold transition-colors">
                  {getContactDisplayName(deal.contacts)}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-4">
              {deal.value && (
                <span className="text-2xl font-bold gold-text">{formatCurrency(deal.value)}</span>
              )}
              <Select value={deal.stage_id} onValueChange={(v) => v && updateStage(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stage Progress */}
          <div className="flex items-center gap-1 mt-6 overflow-x-auto pb-2">
            {stages.map((s, i) => {
              const currentIdx = stages.findIndex((st) => st.id === deal.stage_id);
              const isPast = i <= currentIdx;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`h-2 rounded-full transition-all ${i === 0 ? 'w-8' : 'w-12'}`}
                    style={{
                      background: isPast ? s.color : 'oklch(0.25 0.02 250)',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {deal.expected_close_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" /> Expected close: {formatDate(deal.expected_close_date)}
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" /> Created: {formatDate(deal.created_at)}
            </div>
            {deal.description && (
              <div className="mt-4">
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm">{deal.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Tasks ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No tasks</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${task.completed ? 'bg-emerald-400' : 'bg-gold'}`} />
                    <span className={task.completed ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No activity</p>
            ) : (
              <div className="space-y-3 relative">
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 relative text-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-gold/30 border-2 border-gold mt-1 shrink-0 z-10" />
                    <div className="flex-1">
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
