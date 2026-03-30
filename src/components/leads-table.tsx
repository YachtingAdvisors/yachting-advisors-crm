'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { Lead, LeadStatus } from '@/lib/types';
import StatusBadge from './status-badge';
import SourceBadge from './source-badge';
import SearchBar from './search-bar';
import StatsBar from './stats-bar';
import LeadDetailPanel from './lead-detail-panel';

const FILTER_STATUSES: (LeadStatus | 'All')[] = ['All', 'New', 'Qualified', 'Converted', 'Inactive'];
const PAGE_SIZE = 50;

const ROW_BORDER: Record<LeadStatus, string> = {
  New: 'border-l-2 border-l-blue-500',
  Qualified: 'border-l-2 border-l-amber-500',
  Converted: 'border-l-2 border-l-emerald-500',
  Inactive: 'border-l-2 border-l-gray-600',
};

interface Props {
  clientId: string | null;
}

export default function LeadsTable({ clientId }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LeadStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [page, setPage] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(0);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'All') params.set('status', status);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (clientId) params.set('client_id', clientId);
    params.set('sort', sort);
    params.set('order', order);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(page * PAGE_SIZE));

    try {
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, clientId, sort, order, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const newLead = payload.new as Lead;
          if (clientId && newLead.client_id !== clientId) return;
          setLeads((prev) => [newLead, ...prev]);
          setTotal((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          const updated = payload.new as Lead;
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? updated : l))
          );
          if (selectedLead?.id === updated.id) {
            setSelectedLead(updated);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'leads' },
        (payload) => {
          const deleted = payload.old as { id: string };
          setLeads((prev) => prev.filter((l) => l.id !== deleted.id));
          setTotal((prev) => Math.max(0, prev - 1));
          if (selectedLead?.id === deleted.id) {
            setSelectedLead(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, selectedLead?.id]);

  function toggleSort(col: string) {
    if (sort === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setOrder('desc');
    }
    setPage(0);
  }

  function handleLeadUpdate(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  }

  const newCount = leads.filter((l) => l.status === 'New').length;
  const qualifiedCount = leads.filter((l) => l.status === 'Qualified').length;
  const convertedCount = leads.filter((l) => l.status === 'Converted').length;
  const inactiveCount = leads.filter((l) => l.status === 'Inactive').length;

  const pageStart = page * PAGE_SIZE + 1;
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, total);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function emptyMessage() {
    if (debouncedSearch) return 'No leads match your search.';
    if (status !== 'All') return `No ${status} leads.`;
    return 'No leads yet.';
  }

  function handleLeadDelete(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    setSelectedLead(null);
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return null;
    return <span className="ml-1 text-blue-400">{order === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-6">
      <StatsBar
        total={total}
        newCount={newCount}
        qualifiedCount={qualifiedCount}
        convertedCount={convertedCount}
        inactiveCount={inactiveCount}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchBar value={search} onChange={handleSearchChange} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(0); }}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                status === s
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-[#141620] border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-800 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              {[
                { key: 'name', label: 'Name', className: '' },
                { key: 'email', label: 'Email', className: '' },
                { key: 'phone', label: 'Phone', className: 'hidden sm:table-cell' },
                { key: 'source', label: 'Source', className: '' },
                { key: 'campaign', label: 'Campaign', className: 'hidden sm:table-cell' },
                { key: 'status', label: 'Status', className: '' },
                { key: 'created_at', label: 'Date', className: '' },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium cursor-pointer hover:text-gray-300 whitespace-nowrap ${col.className}`}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  {emptyMessage()}
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`border-b border-gray-800/50 hover:bg-[#141620] cursor-pointer transition-colors ${ROW_BORDER[lead.status]}`}
                >
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">{lead.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap hidden sm:table-cell">{lead.phone || '—'}</td>
                  <td className="px-4 py-3"><SourceBadge source={lead.source} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate hidden sm:table-cell">{lead.campaign || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {pageStart}–{pageEnd} of {total} leads
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-700 bg-[#141620] hover:border-gray-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-gray-700 bg-[#141620] hover:border-gray-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
          onDelete={handleLeadDelete}
        />
      )}
    </div>
  );
}
