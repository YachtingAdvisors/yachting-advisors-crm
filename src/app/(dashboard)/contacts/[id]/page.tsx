'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Mail, Phone, Building, Briefcase, Calendar, Edit2 } from 'lucide-react';
import { type Contact, type Activity, type Deal, type Task, getContactDisplayName } from '@/lib/types';
import { formatDate, formatRelativeTime, formatCurrency, formatPhone } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [contactRes, activitiesRes, dealsRes, tasksRes] = await Promise.all([
        fetch(`/api/contacts/${id}`),
        fetch(`/api/activities?contact_id=${id}&limit=20`),
        fetch(`/api/deals?contact_id=${id}`),
        fetch(`/api/tasks?contact_id=${id}`),
      ]);
      const contactData = await contactRes.json();
      const activitiesData = await activitiesRes.json();
      const dealsData = await dealsRes.json();
      const tasksData = await tasksRes.json();

      setContact(contactData.contact);
      setNotes(contactData.contact?.notes || '');
      setActivities(activitiesData.activities || []);
      setDeals(dealsData.deals || []);
      setTasks(tasksData.tasks || []);
      setLoading(false);
    }
    load();
  }, [id]);

  const saveNotes = async () => {
    await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    toast.success('Notes saved');
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-40 rounded-xl bg-card" /><div className="h-64 rounded-xl bg-card" /></div>;
  }

  if (!contact) {
    return <div className="text-center py-12 text-muted-foreground">Contact not found</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact Info + Notes */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-gold/20 text-gold text-lg font-semibold">
                    {contact.first_name[0]}{contact.last_name?.[0] || ''}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{getContactDisplayName(contact)}</h2>
                  {contact.company && <p className="text-muted-foreground text-sm">{contact.company}</p>}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" /> {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" /> {formatPhone(contact.phone)}
                  </div>
                )}
                {contact.job_title && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="w-4 h-4" /> {contact.job_title}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" /> Added {formatDate(contact.created_at)}
                </div>
              </div>
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                className="min-h-[100px] resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Middle Column: Activity Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Deals */}
          {deals.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Deals ({deals.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deals.map((deal) => (
                  <Link key={deal.id} href={`/deals/${deal.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-sm">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">{deal.deal_stages?.name}</p>
                      </div>
                      {deal.value && <span className="text-sm font-semibold text-gold">{formatCurrency(deal.value)}</span>}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Tasks ({tasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${task.completed ? 'bg-emerald-400' : 'bg-gold'}`} />
                    <span className={task.completed ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(task.due_date)}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No activity yet</p>
              ) : (
                <div className="space-y-4 relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                  {activities.map((a) => (
                    <div key={a.id} className="flex gap-4 relative">
                      <div className="w-3.5 h-3.5 rounded-full bg-gold/30 border-2 border-gold mt-0.5 shrink-0 z-10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.title}</p>
                        {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
