'use client';

import { useEffect, useState, useCallback } from 'react';
import { useClient } from '@/contexts/client-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, GripVertical, DollarSign, Calendar } from 'lucide-react';
import { type Deal, type DealStage, getContactDisplayName } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import Link from 'next/link';

export default function DealsPage() {
  const { clientId, loading } = useClient();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [fetching, setFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);

  const fetchDeals = useCallback(async () => {
    if (!clientId) return;
    setFetching(true);
    const res = await fetch(`/api/deals?client_id=${clientId}`);
    const data = await res.json();
    setDeals(data.deals || []);
    setStages(data.stages || []);
    setFetching(false);
  }, [clientId]);

  useEffect(() => {
    if (!loading) {
      fetchDeals();
      if (clientId) {
        fetch(`/api/contacts?client_id=${clientId}&limit=100`)
          .then((r) => r.json())
          .then((d) => setContacts(d.contacts || []));
      }
    }
  }, [fetchDeals, loading, clientId]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const targetStageId = result.destination.droppableId;
    const position = result.destination.index;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, stage_id: targetStageId, position } : d
      )
    );

    await fetch('/api/deals/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, targetStageId, position }),
    });
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        stage_id: form.get('stage_id'),
        title: form.get('title'),
        value: form.get('value') ? Number(form.get('value')) : null,
        contact_id: form.get('contact_id') || null,
        expected_close_date: form.get('expected_close_date') || null,
        description: form.get('description') || null,
      }),
    });
    if (res.ok) {
      toast.success('Deal created');
      setDialogOpen(false);
      fetchDeals();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to create deal');
    }
  };

  const getDealsForStage = (stageId: string) =>
    deals.filter((d) => d.stage_id === stageId).sort((a, b) => a.position - b.position);

  const totalPipelineValue = deals
    .filter((d) => !d.deal_stages?.is_won && !d.deal_stages?.is_lost)
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  if (loading || fetching) {
    return <div className="space-y-4 animate-pulse"><div className="h-10 w-48 rounded bg-card" /><div className="h-96 rounded-xl bg-card" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deals</h1>
          <p className="text-muted-foreground text-sm">
            Pipeline value: <span className="text-gold font-semibold">{formatCurrency(totalPipelineValue)}</span>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button className="gold-gradient text-navy font-semibold hover:opacity-90" />}
          >
            <Plus className="w-4 h-4 mr-2" /> New Deal
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input name="title" required />
              </div>
              <div>
                <Label>Value</Label>
                <Input name="value" type="number" step="0.01" placeholder="0.00" />
              </div>
              <div>
                <Label>Stage *</Label>
                <Select name="stage_id" required>
                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>
                    {stages.filter((s) => !s.is_won && !s.is_lost).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contact</Label>
                <Select name="contact_id">
                  <SelectTrigger><SelectValue placeholder="Select contact (optional)" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{getContactDisplayName(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected Close Date</Label>
                <Input name="expected_close_date" type="date" />
              </div>
              <Button type="submit" className="w-full gold-gradient text-navy font-semibold">Create Deal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stages.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No pipeline stages configured. Go to Settings to set up your pipeline.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {stages.map((stage) => {
                  const stageDeals = getDealsForStage(stage.id);
                  const stageValue = stageDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
                  return (
                    <Droppable key={stage.id} droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-shrink-0 w-[280px] rounded-xl p-3 transition-colors ${
                            snapshot.isDraggingOver ? 'bg-accent/50' : 'bg-card/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                            <h3 className="text-sm font-semibold flex-1">{stage.name}</h3>
                            <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                          </div>
                          {stageValue > 0 && (
                            <p className="text-xs text-muted-foreground px-1 mb-2">{formatCurrency(stageValue)}</p>
                          )}
                          <div className="space-y-2 min-h-[40px]">
                            {stageDeals.map((deal, index) => (
                              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`glass-card rounded-lg p-3 cursor-grab active:cursor-grabbing ${
                                      snapshot.isDragging ? 'ring-2 ring-gold/50 shadow-xl' : ''
                                    }`}
                                  >
                                    <Link href={`/deals/${deal.id}`}>
                                      <p className="font-medium text-sm truncate">{deal.title}</p>
                                    </Link>
                                    {deal.contacts && (
                                      <p className="text-xs text-muted-foreground mt-1 truncate">
                                        {getContactDisplayName(deal.contacts)}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                      {deal.value ? (
                                        <span className="text-xs font-semibold text-gold flex items-center gap-1">
                                          <DollarSign className="w-3 h-3" />
                                          {formatCurrency(deal.value)}
                                        </span>
                                      ) : <span />}
                                      {deal.expected_close_date && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {formatDate(deal.expected_close_date)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </DragDropContext>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <Card className="glass-card">
              <CardContent className="pt-4">
                {deals.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No deals yet</p>
                ) : (
                  <div className="space-y-2">
                    {deals.map((deal) => (
                      <Link key={deal.id} href={`/deals/${deal.id}`}>
                        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: deal.deal_stages?.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{deal.title}</p>
                            <p className="text-xs text-muted-foreground">{deal.deal_stages?.name}</p>
                          </div>
                          {deal.contacts && (
                            <span className="text-sm text-muted-foreground hidden sm:block">{getContactDisplayName(deal.contacts)}</span>
                          )}
                          {deal.value && <span className="text-sm font-semibold text-gold">{formatCurrency(deal.value)}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
