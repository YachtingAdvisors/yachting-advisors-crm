'use client';

import { useEffect, useState, useCallback } from 'react';
import { useClient } from '@/contexts/client-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Phone, Mail, Calendar, FileText, ArrowRightLeft, CheckSquare } from 'lucide-react';
import { type Activity, type ActivityType, getContactDisplayName } from '@/lib/types';
import { formatRelativeTime, formatDateTime } from '@/lib/format';
import { toast } from 'sonner';

const activityIcons: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckSquare,
  stage_change: ArrowRightLeft,
  status_change: ArrowRightLeft,
};

const activityColors: Record<string, string> = {
  call: 'bg-blue-500/20 text-blue-400',
  email: 'bg-purple-500/20 text-purple-400',
  meeting: 'bg-amber-500/20 text-amber-400',
  note: 'bg-gray-500/20 text-gray-400',
  task: 'bg-emerald-500/20 text-emerald-400',
  stage_change: 'bg-gold/20 text-gold',
  status_change: 'bg-gold/20 text-gold',
};

export default function ActivitiesPage() {
  const { clientId, loading } = useClient();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!clientId) return;
    setFetching(true);
    const params = new URLSearchParams({ client_id: clientId, limit: '50' });
    if (typeFilter !== 'all') params.set('type', typeFilter);
    const res = await fetch(`/api/activities?${params}`);
    const data = await res.json();
    setActivities(data.activities || []);
    setTotal(data.total || 0);
    setFetching(false);
  }, [clientId, typeFilter]);

  useEffect(() => {
    if (!loading) fetchActivities();
  }, [fetchActivities, loading]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        type: form.get('type'),
        title: form.get('title'),
        description: form.get('description') || null,
      }),
    });
    if (res.ok) {
      toast.success('Activity logged');
      setDialogOpen(false);
      fetchActivities();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activities</h1>
          <p className="text-muted-foreground text-sm">{total} activities</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button className="gold-gradient text-navy font-semibold hover:opacity-90" />}
          >
            <Plus className="w-4 h-4 mr-2" /> Log Activity
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Activity</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Type *</Label>
                <Select name="type" defaultValue="note">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input name="title" required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" />
              </div>
              <Button type="submit" className="w-full gold-gradient text-navy font-semibold">Log Activity</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'call', 'email', 'meeting', 'note', 'task', 'stage_change'].map((t) => (
          <Button
            key={t}
            variant={typeFilter === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(t)}
            className={typeFilter === t ? 'gold-gradient text-navy' : ''}
          >
            {t === 'all' ? 'All' : t === 'stage_change' ? 'Stage Changes' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
          </Button>
        ))}
      </div>

      {/* Activity Feed */}
      {fetching ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />)}</div>
      ) : activities.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No activities found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 relative">
          <div className="absolute left-5 top-4 bottom-4 w-px bg-border" />
          {activities.map((a) => {
            const Icon = activityIcons[a.type] || FileText;
            const colorClass = activityColors[a.type] || activityColors.note;
            return (
              <div key={a.id} className="flex gap-4 relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <Card className="glass-card flex-1">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{a.title}</p>
                        {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {a.contacts && (
                            <span className="text-xs text-muted-foreground">
                              {getContactDisplayName(a.contacts)}
                            </span>
                          )}
                          {a.deals && (
                            <span className="text-xs text-muted-foreground">
                              {a.deals.title}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(a.created_at)}</p>
                        {a.user_email && <p className="text-xs text-muted-foreground">{a.user_email}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
