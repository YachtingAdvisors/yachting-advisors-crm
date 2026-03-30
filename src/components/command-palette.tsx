'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Lead, Deal, DEAL_STAGE_COLORS } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  Qualified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Converted: 'bg-violet-50 text-violet-700 border-violet-200',
  Inactive: 'bg-gray-100 text-gray-600 border-gray-300',
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setLeads([]);
      setDeals([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setLeads([]);
      setDeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [leadsRes, dealsRes] = await Promise.all([
        fetch(`/api/leads?search=${encodeURIComponent(q)}&limit=5`),
        fetch(`/api/deals?search=${encodeURIComponent(q)}&limit=5`),
      ]);
      const [leadsData, dealsData] = await Promise.all([
        leadsRes.json(),
        dealsRes.json(),
      ]);
      setLeads(leadsData.leads || []);
      setDeals(dealsData.deals || []);
    } catch {
      setLeads([]);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 200);
  }

  function navigateToLead() {
    onClose();
    router.push('/');
  }

  function navigateToDeal() {
    onClose();
    router.push('/deals');
  }

  if (!open) return null;

  const hasResults = leads.length > 0 || deals.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'command-palette-in 150ms ease-out',
        }}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-gray-200 px-4">
          <svg
            className="w-5 h-5 text-gray-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search leads and deals..."
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#33475b] placeholder-gray-400 py-4 px-3"
          />
          <kbd className="text-[10px] text-gray-500 bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Searching...
            </div>
          )}

          {!loading && hasQuery && !hasResults && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No results found
            </div>
          )}

          {!loading && !hasQuery && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Type to search across leads and deals
            </div>
          )}

          {!loading && leads.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-white">
                Leads
              </div>
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={navigateToLead}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#1a1a2e] font-medium block truncate">
                      {lead.name}
                    </span>
                    {lead.email && (
                      <span className="text-xs text-gray-500 block truncate">
                        {lead.email}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${STATUS_COLORS[lead.status] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
                  >
                    {lead.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && deals.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-white">
                Deals
              </div>
              {deals.map((deal) => (
                <button
                  key={deal.id}
                  onClick={navigateToDeal}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#1a1a2e] font-medium block truncate">
                      {deal.contact_name}
                    </span>
                    {deal.contact_email && (
                      <span className="text-xs text-gray-500 block truncate">
                        {deal.contact_email}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${DEAL_STAGE_COLORS[deal.stage] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
                  >
                    {deal.stage}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes command-palette-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
