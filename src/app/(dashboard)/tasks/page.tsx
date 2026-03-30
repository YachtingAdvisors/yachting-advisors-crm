'use client';

import { useEffect, useState, useCallback } from 'react';
import { useClient } from '@/contexts/client-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Clock, AlertTriangle, CalendarCheck, CheckCircle } from 'lucide-react';
import { type Task, type TaskPriority, getContactDisplayName } from '@/lib/types';
import { formatDate, isDueOverdue, isDueToday } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-amber-500/20 text-amber-400',
  urgent: 'bg-red-500/20 text-red-400',
};

export default function TasksPage() {
  const { clientId, loading } = useClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!clientId) return;
    setFetching(true);
    const params = new URLSearchParams({ client_id: clientId });
    if (tab !== 'all') params.set('due', tab);
    const res = await fetch(`/api/tasks?${params}`);
    const data = await res.json();
    setTasks(data.tasks || []);
    setTotal(data.total || 0);
    setFetching(false);
  }, [clientId, tab]);

  useEffect(() => {
    if (!loading) fetchTasks();
  }, [fetchTasks, loading]);

  const toggleComplete = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    });
    if (res.ok) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );
      toast.success(task.completed ? 'Task reopened' : 'Task completed');
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        title: form.get('title'),
        description: form.get('description') || null,
        due_date: form.get('due_date') || null,
        priority: form.get('priority') || 'medium',
      }),
    });
    if (res.ok) {
      toast.success('Task created');
      setDialogOpen(false);
      fetchTasks();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground text-sm">{total} tasks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button className="gold-gradient text-navy font-semibold hover:opacity-90" />}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input name="title" required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input name="due_date" type="datetime-local" />
              </div>
              <div>
                <Label>Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full gold-gradient text-navy font-semibold">Create Task</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> All</TabsTrigger>
          <TabsTrigger value="today" className="gap-1.5"><CalendarCheck className="w-3.5 h-3.5" /> Today</TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Overdue</TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {fetching ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-card animate-pulse" />)}</div>
      ) : tasks.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const overdue = !task.completed && isDueOverdue(task.due_date);
            const dueToday = !task.completed && isDueToday(task.due_date);
            return (
              <Card key={task.id} className="glass-card glass-card-hover transition-all">
                <CardContent className="py-3 px-4 flex items-center gap-4">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleComplete(task)}
                    className="data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium text-sm', task.completed && 'line-through text-muted-foreground')}>
                      {task.title}
                    </p>
                    {task.contacts && (
                      <p className="text-xs text-muted-foreground">{getContactDisplayName(task.contacts)}</p>
                    )}
                  </div>
                  <Badge className={priorityColors[task.priority]} variant="secondary">
                    {task.priority}
                  </Badge>
                  {task.due_date && (
                    <span className={cn(
                      'text-xs whitespace-nowrap',
                      overdue ? 'text-red-400 font-medium' : dueToday ? 'text-amber-400' : 'text-muted-foreground'
                    )}>
                      {overdue ? 'Overdue: ' : ''}{formatDate(task.due_date)}
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
