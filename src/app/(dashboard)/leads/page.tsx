'use client';

import { useCallback, useEffect, useState } from 'react';
import { useClient } from '@/contexts/client-context';
import { createBrowserClient } from '@/lib/supabase';
import { type Lead, type LeadStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowUpDown, Mail, Phone, UserPlus } from 'lucide-react';
import { formatDate, formatPhone, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FILTER_STATUSES: (LeadStatus | 'All')[] = ['All', 'New', 'Qualified', 'Converted', 'Inactive'];

const statusColors: Record<string, string> = {
  New: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Qualified: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const sourceColors: Record<string, string> = {
  Meta: 'bg-blue-500/20 text-blue-400',
  Instagram: 'bg-purple-500/20 text-purple-400',
  Website: 'bg-emerald-500/20 text-emerald-400',
};

export default function LeadsPage() {
  const { clientId, loading: clientLoading } = useClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LeadStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');

  const fetchLeads = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'All') params.set('status', status);
    if (search) params.set('search', search);
    params.set('client_id', clientId);
    params.set('sort', sort);
    params.set('order', order);
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [status, search, clientId, sort, order]);

  useEffect(() => {
    if (!clientLoading) fetchLeads();
  }, [fetchLeads, clientLoading]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const newLead = payload.new as Lead;
        if (clientId && newLead.client_id !== clientId) return;
        setLeads((prev) => [newLead, ...prev]);
        setTotal((prev) => prev + 1);
        toast.info(`New lead: ${newLead.name}`);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const updated = payload.new as Lead;
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        if (selectedLead?.id === updated.id) setSelectedLead(updated);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, selectedLead?.id]);

  const toggleSort = (col: string) => {
    if (sort === col) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('desc'); }
  };

  const updateLead = async (field: string, value: string) => {
    if (!selectedLead) return;
    const res = await fetch(`/api/leads/${selectedLead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    const data = await res.json();
    if (data.lead) {
      setLeads((prev) => prev.map((l) => (l.id === data.lead.id ? data.lead : l)));
      setSelectedLead(data.lead);
    }
  };

  const convertToContact = async () => {
    if (!selectedLead) return;
    const res = await fetch(`/api/contacts/${selectedLead.id}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: selectedLead.id }),
    });
    if (res.ok) {
      toast.success('Lead converted to contact');
      setSelectedLead(null);
    } else {
      toast.error('Failed to convert lead');
    }
  };

  const newCount = leads.filter((l) => l.status === 'New').length;
  const qualifiedCount = leads.filter((l) => l.status === 'Qualified').length;
  const convertedCount = leads.filter((l) => l.status === 'Converted').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground text-sm">{total} total leads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-foreground' },
          { label: 'New', value: newCount, color: 'text-blue-400' },
          { label: 'Qualified', value: qualifiedCount, color: 'text-amber-400' },
          { label: 'Converted', value: convertedCount, color: 'text-emerald-400' },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className={cn('text-2xl font-bold mt-0.5', stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search leads..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_STATUSES.map((s) => (
            <Button
              key={s}
              variant={status === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus(s)}
              className={status === s ? 'gold-gradient text-navy' : ''}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' },
                { key: 'source', label: 'Source' },
                { key: 'campaign', label: 'Campaign' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Date' },
              ].map((col) => (
                <TableHead
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer hover:text-foreground whitespace-nowrap"
                >
                  {col.label}
                  {sort === col.key && (
                    <span className="ml-1 text-gold">{order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No leads found</TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  onClick={() => { setSelectedLead(lead); setNotes(lead.notes || ''); }}
                  className="cursor-pointer hover:bg-accent/50"
                >
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{lead.email || '—'}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{formatPhone(lead.phone) || '—'}</TableCell>
                  <TableCell>
                    <Badge className={sourceColors[lead.source] || ''} variant="secondary">{lead.source}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{lead.campaign || '—'}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status] || ''} variant="outline">{lead.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(lead.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Lead Detail Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div className="space-y-2">
                  {selectedLead.email && (
                    <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                      <Mail className="w-4 h-4" /> {selectedLead.email}
                    </a>
                  )}
                  {selectedLead.phone && (
                    <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                      <Phone className="w-4 h-4" /> {formatPhone(selectedLead.phone)}
                    </a>
                  )}
                </div>

                {/* Status & Source */}
                <div className="flex items-center gap-3">
                  <Badge className={sourceColors[selectedLead.source] || ''} variant="secondary">{selectedLead.source}</Badge>
                  <Select value={selectedLead.status} onValueChange={(v) => v && updateLead('status', v)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['New', 'Qualified', 'Converted', 'Inactive'] as LeadStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  {selectedLead.campaign && <DetailField label="Campaign" value={selectedLead.campaign} />}
                  {selectedLead.ad_name && <DetailField label="Ad Name" value={selectedLead.ad_name} />}
                  {selectedLead.form_name && <DetailField label="Form" value={selectedLead.form_name} />}
                  <DetailField label="Received" value={formatRelativeTime(selectedLead.created_at)} />
                </div>

                {/* Form Responses */}
                {selectedLead.form_responses?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Form Responses</p>
                    <div className="space-y-2">
                      {selectedLead.form_responses.map((fr, i) => (
                        <Card key={i} className="bg-card">
                          <CardContent className="py-2 px-3">
                            <p className="text-xs text-muted-foreground">{fr.question}</p>
                            <p className="text-sm mt-0.5">{fr.answer}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => { if (notes !== (selectedLead.notes || '')) updateLead('notes', notes); }}
                    placeholder="Add notes..."
                    className="min-h-[80px] resize-none"
                  />
                </div>

                {/* Convert to Contact */}
                {!selectedLead.contact_id && (
                  <Button onClick={convertToContact} variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                    <UserPlus className="w-4 h-4 mr-2" /> Convert to Contact
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}
