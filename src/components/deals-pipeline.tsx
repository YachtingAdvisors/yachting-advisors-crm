'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { Deal, DealStage, DEAL_STAGES } from '@/lib/types';
import DealStageBadge from './deal-stage-badge';
import DealDetailPanel from './deal-detail-panel';
import NewDealForm from './new-deal-form';
import SearchBar from './search-bar';

interface InitialValues {
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface Props {
  clientId: string | null;
  filterClosingMonth?: boolean;
  onClearFilter?: () => void;
  initialOpenNewDeal?: boolean;
  initialValues?: InitialValues;
}

const PIPELINE_STAGES: DealStage[] = [
  'Prospecting',
  'Discovery',
  'Proposal',
  'Negotiation',
  'Contract Sent',
  'Under Review',
  'Closing',
];

/** Returns a CSS color class string based on closing date urgency */
function closingDateColor(closingDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const closing = new Date(closingDate);
  closing.setHours(0, 0, 0, 0);
  const diffMs = closing.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'text-red-500';
  if (diffDays <= 7) return 'text-amber-500';
  return 'text-gray-500';
}

export default function DealsPipeline({
  clientId,
  filterClosingMonth,
  onClearFilter,
  initialOpenNewDeal,
  initialValues,
}: Props) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'board' | 'table'>('board');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);

  // CSV export state
  const [exporting, setExporting] = useState(false);

  // Bulk selection state (table view only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<DealStage>('Prospecting');
  const [bulkApplying, setBulkApplying] = useState(false);

  // Open new deal form automatically if instructed via URL params
  useEffect(() => {
    if (initialOpenNewDeal) {
      setShowNewDeal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll shadow state for board container
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (clientId) params.set('client_id', clientId);
    params.set('sort', 'updated_at');
    params.set('order', 'desc');

    try {
      const res = await fetch(`/api/deals?${params}`);
      const data = await res.json();
      setDeals(data.deals || []);
    } finally {
      setLoading(false);
    }
  }, [search, clientId]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Update scroll shadows on mount and when scrolling
  useEffect(() => {
    const el = boardScrollRef.current;
    if (!el) return;

    function updateShadows() {
      if (!el) return;
      setShowLeftShadow(el.scrollLeft > 4);
      setShowRightShadow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }

    updateShadows();
    el.addEventListener('scroll', updateShadows, { passive: true });
    const ro = new ResizeObserver(updateShadows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateShadows);
      ro.disconnect();
    };
  }, [loading, deals.length]);

  // Real-time subscription for deals
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('deals-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deals' },
        (payload) => {
          const newDeal = payload.new as Deal;
          if (clientId && newDeal.client_id !== clientId) return;
          setDeals((prev) => [newDeal, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deals' },
        (payload) => {
          const updated = payload.new as Deal;
          setDeals((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
          if (selectedDeal?.id === updated.id) {
            setSelectedDeal(updated);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'deals' },
        (payload) => {
          const deleted = payload.old as { id: string };
          setDeals((prev) => prev.filter((d) => d.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, selectedDeal?.id]);

  function handleDealUpdate(updated: Deal) {
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDeal(updated);
  }

  function handleDealDelete(dealId: string) {
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    setSelectedDeal(null);
  }

  function handleDealCreate(deal: Deal) {
    setDeals((prev) => [deal, ...prev]);
  }

  function formatPrice(val: number | null) {
    if (!val) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }

  // --- CSV Export for Deals ---
  function handleExportCSV() {
    setExporting(true);
    try {
      const header = [
        'Contact', 'Email', 'Phone', 'Description',
        'List Price', 'Offer Price', 'Sale Price', 'Stage',
        'Closing Date', 'Notes',
      ];
      const rows = deals.map((d) => [
        d.contact_name,
        d.contact_email || '',
        d.contact_phone || '',
        d.description || '',
        d.list_price ? String(d.list_price) : '',
        d.offer_price ? String(d.offer_price) : '',
        d.sale_price ? String(d.sale_price) : '',
        d.stage,
        d.closing_date ? new Date(d.closing_date).toLocaleDateString() : '',
        d.agent_notes || '',
      ]);

      const csvContent = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `deals-export-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  // --- Bulk selection helpers (table view) ---
  function toggleSelectAll(allDeals: Deal[]) {
    if (selectedIds.size === allDeals.length && allDeals.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allDeals.map((d) => d.id)));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleBulkApply() {
    if (selectedIds.size === 0) return;
    setBulkApplying(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/deals/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: bulkStage }),
        });
      }
      setSelectedIds(new Set());
      await fetchDeals();
    } finally {
      setBulkApplying(false);
    }
  }

  // Clear selection when switching views or searching
  useEffect(() => {
    setSelectedIds(new Set());
  }, [view, search]);

  // Apply closing-month filter if active
  const filteredDeals = filterClosingMonth
    ? deals.filter((d) => {
        if (!d.closing_date) return false;
        if (d.stage === 'Won' || d.stage === 'Lost') return false;
        const now = new Date();
        const cd = new Date(d.closing_date);
        return cd.getMonth() === now.getMonth() && cd.getFullYear() === now.getFullYear();
      })
    : deals;

  // Pipeline stats
  const activeDeals = deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost');
  const totalPipelineValue = activeDeals.reduce((sum, d) => sum + (d.list_price || 0), 0);
  const soldDeals = deals.filter((d) => d.stage === 'Won');
  const closedValue = soldDeals.reduce((sum, d) => sum + (d.sale_price || d.list_price || 0), 0);
  const totalCommission = soldDeals.reduce((sum, d) => sum + (d.commission_amount || 0), 0);

  // Table view: active deals first, then closed (Sold + Lost) with a divider
  const activeTableDeals = filteredDeals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost');
  const closedTableDeals = filteredDeals.filter((d) => d.stage === 'Won' || d.stage === 'Lost');
  const allTableDeals = [...activeTableDeals, ...closedTableDeals];
  const allTableSelected = allTableDeals.length > 0 && selectedIds.size === allTableDeals.length;

  return (
    <div className="space-y-6">
      {/* Active filter notice */}
      {filterClosingMonth && (
        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-sm text-amber-700">Showing deals closing this month</span>
          <button
            onClick={onClearFilter}
            className="ml-auto text-xs text-amber-700 hover:text-amber-900 transition-colors"
          >
            Clear filter ×
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Active Deals</p>
          <p className="text-2xl font-semibold mt-1 text-[#1a1a2e]">{activeDeals.length}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Pipeline Value</p>
          <p className="text-2xl font-semibold mt-1 text-blue-600">{formatPrice(totalPipelineValue) || '$0'}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Closed Won</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600">{soldDeals.length}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Closed Value</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600">{formatPrice(closedValue) || '$0'}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Commission</p>
          <p className="text-2xl font-semibold mt-1 text-violet-600">{formatPrice(totalCommission) || '$0'}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'board' ? 'bg-[#ff7a59] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Board
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'table' ? 'bg-[#ff7a59] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Table
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            onClick={() => setShowNewDeal(true)}
            className="px-4 py-1.5 text-sm bg-[#ff7a59] border border-[#ff7a59] rounded-lg text-white hover:bg-[#e8664a] transition-colors"
          >
            + New Deal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading deals...</div>
      ) : deals.length === 0 && !search ? (
        /* Global empty state */
        <div className="bg-white flex flex-col items-center justify-center py-24 border border-dashed border-gray-300 rounded-xl">
          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 font-medium mb-1">No deals yet</p>
          <p className="text-sm text-gray-400 mb-6">Start tracking your deals</p>
          <button
            onClick={() => setShowNewDeal(true)}
            className="px-5 py-2.5 text-sm bg-[#ff7a59] border border-[#ff7a59] rounded-lg text-white hover:bg-[#e8664a] transition-colors"
          >
            Create your first deal
          </button>
        </div>
      ) : view === 'board' ? (
        /* Kanban Board View */
        <div className="relative">
          {/* Left scroll shadow */}
          {showLeftShadow && (
            <div className="pointer-events-none absolute left-0 top-0 h-full w-12 z-10"
              style={{ background: 'linear-gradient(to right, rgba(245,248,250,0.9), transparent)' }} />
          )}
          {/* Right scroll shadow */}
          {showRightShadow && (
            <div className="pointer-events-none absolute right-0 top-0 h-full w-12 z-10"
              style={{ background: 'linear-gradient(to left, rgba(245,248,250,0.9), transparent)' }} />
          )}

          <div ref={boardScrollRef} className="overflow-x-auto pb-4">
            <div className="flex gap-3" style={{ minWidth: `${PIPELINE_STAGES.length * 180}px` }}>
              {PIPELINE_STAGES.map((stage) => {
                const stageDeals = filteredDeals.filter((d) => d.stage === stage);
                const stageValue = stageDeals.reduce((sum, d) => sum + (d.list_price || 0), 0);
                return (
                  <div key={stage} className="flex-1 min-w-[160px]">
                    {/* Column header — stacked count + value */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <DealStageBadge stage={stage} />
                      <div className="flex flex-col items-end leading-none gap-0.5">
                        <span className="text-xs text-gray-400 font-medium">{stageDeals.length} {stageDeals.length === 1 ? 'deal' : 'deals'}</span>
                        {stageValue > 0 && (
                          <span className="text-xs text-gray-500 font-mono">{formatPrice(stageValue)}</span>
                        )}
                      </div>
                    </div>
                    {/* Column cards */}
                    <div className="space-y-2">
                      {stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          onClick={() => setSelectedDeal(deal)}
                          className="bg-white shadow-sm border border-gray-200 rounded-lg p-2.5 cursor-pointer hover:border-gray-300 hover:shadow transition-colors"
                        >
                          <p className="text-xs text-[#1a1a2e] font-medium truncate">{deal.contact_name}</p>
                          {deal.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{deal.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            {deal.list_price ? (
                              <span className="text-xs text-[#0091ae] font-mono">{formatPrice(deal.list_price)}</span>
                            ) : (
                              <span />
                            )}
                          </div>
                          {deal.closing_date && (
                            <p className={`text-xs mt-1 ${closingDateColor(deal.closing_date)}`}>
                              Close: {new Date(deal.closing_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                      {stageDeals.length === 0 && (
                        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <p className="text-xs text-gray-400">No deals</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Closed stages row */}
            {(deals.some((d) => d.stage === 'Won') || deals.some((d) => d.stage === 'Lost')) && (
              <div className="grid grid-cols-2 gap-4 mt-6 border-t border-gray-200 pt-6">
                {/* Won */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <DealStageBadge stage="Won" />
                    <div className="flex flex-col items-end leading-none gap-0.5">
                      <span className="text-xs text-gray-400 font-medium">
                        {deals.filter((d) => d.stage === 'Won').length} {deals.filter((d) => d.stage === 'Won').length === 1 ? 'deal' : 'deals'}
                      </span>
                      {deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + (d.sale_price || d.list_price || 0), 0) > 0 && (
                        <span className="text-xs text-gray-500 font-mono">
                          {formatPrice(deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + (d.sale_price || d.list_price || 0), 0))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {deals.filter((d) => d.stage === 'Won').map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDeal(deal)}
                        className="bg-white shadow-sm border border-emerald-200 rounded-lg p-3 cursor-pointer hover:border-emerald-300 hover:shadow transition-colors"
                      >
                        <p className="text-sm text-[#1a1a2e] font-medium truncate">{deal.contact_name}</p>
                        {deal.description && (
                          <p className="text-xs text-gray-500 mt-1 truncate">{deal.description}</p>
                        )}
                        {deal.sale_price && (
                          <p className="text-xs text-emerald-600 font-mono mt-1">{formatPrice(deal.sale_price)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Lost */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <DealStageBadge stage="Lost" />
                    <span className="text-xs text-gray-400 font-medium">
                      {deals.filter((d) => d.stage === 'Lost').length} {deals.filter((d) => d.stage === 'Lost').length === 1 ? 'deal' : 'deals'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {deals.filter((d) => d.stage === 'Lost').map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDeal(deal)}
                        className="bg-white shadow-sm border border-red-200 rounded-lg p-3 cursor-pointer hover:border-red-300 hover:shadow transition-colors"
                      >
                        <p className="text-sm text-[#1a1a2e] font-medium truncate">{deal.contact_name}</p>
                        {deal.description && (
                          <p className="text-xs text-gray-500 mt-1 truncate">{deal.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="relative overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allTableSelected}
                    onChange={() => toggleSelectAll(allTableDeals)}
                    className="rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Contact</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Description</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">List Price</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Stage</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Closing</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No deals found. Click &quot;+ New Deal&quot; to create one.
                  </td>
                </tr>
              ) : (
                <>
                  {/* Active deals */}
                  {activeTableDeals.map((deal) => (
                    <tr
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(deal.id)}
                          onChange={() => toggleSelectOne(deal.id)}
                          className="rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-[#1a1a2e] font-medium whitespace-nowrap">{deal.contact_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{deal.description || '---'}</td>
                      <td className="px-4 py-3 text-[#0091ae] font-mono text-xs">{formatPrice(deal.list_price) || '---'}</td>
                      <td className="px-4 py-3"><DealStageBadge stage={deal.stage} /></td>
                      <td className={`px-4 py-3 font-mono text-xs whitespace-nowrap ${deal.closing_date ? closingDateColor(deal.closing_date) : 'text-gray-500'}`}>
                        {deal.closing_date ? new Date(deal.closing_date).toLocaleDateString() : '---'}
                      </td>
                    </tr>
                  ))}

                  {/* Closed deals divider */}
                  {closedTableDeals.length > 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Closed Deals</span>
                      </td>
                    </tr>
                  )}

                  {/* Closed deals */}
                  {closedTableDeals.map((deal) => (
                    <tr
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      className="border-b border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(deal.id)}
                          onChange={() => toggleSelectOne(deal.id)}
                          className="rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-[#1a1a2e] font-medium whitespace-nowrap">{deal.contact_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{deal.description || '---'}</td>
                      <td className="px-4 py-3 text-[#0091ae] font-mono text-xs">{formatPrice(deal.list_price) || '---'}</td>
                      <td className="px-4 py-3"><DealStageBadge stage={deal.stage} /></td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                        {deal.closing_date ? new Date(deal.closing_date).toLocaleDateString() : '---'}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>

          {/* Bulk action bar (table view) */}
          {selectedIds.size > 0 && (
            <div className="sticky bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center gap-4 z-20">
              <span className="text-sm text-[#1a1a2e] font-medium">{selectedIds.size} selected</span>
              <select
                value={bulkStage}
                onChange={(e) => setBulkStage(e.target.value as DealStage)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-[#33475b] focus:border-[#0091ae] focus:outline-none"
              >
                {DEAL_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={handleBulkApply}
                disabled={bulkApplying}
                className="px-4 py-1.5 text-sm bg-[#ff7a59] border border-[#ff7a59] rounded-lg text-white hover:bg-[#e8664a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkApplying ? 'Applying...' : 'Apply'}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Panel */}
      {selectedDeal && (
        <DealDetailPanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={handleDealUpdate}
          onDelete={handleDealDelete}
        />
      )}

      {/* New Deal Form */}
      {showNewDeal && (
        <NewDealForm
          clientId={clientId}
          onClose={() => setShowNewDeal(false)}
          onCreate={handleDealCreate}
          initialValues={initialValues}
        />
      )}
    </div>
  );
}
