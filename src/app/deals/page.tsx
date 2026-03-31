'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Deal } from '@/lib/types';
import DealsPipeline from '@/components/deals-pipeline';
import ClientSelector from '@/components/client-selector';
import { useShortcuts } from '@/components/shortcuts-provider';

function ClosingThisMonthBanner({ onFilter }: { onFilter: () => void }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/deals?sort=updated_at&order=desc')
      .then((r) => r.json())
      .then((data) => {
        const deals: Deal[] = data.deals || [];
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const closing = deals.filter((d) => {
          if (!d.closing_date) return false;
          if (d.stage === 'Sold' || d.stage === 'Lost') return false;
          const cd = new Date(d.closing_date);
          return cd.getMonth() === thisMonth && cd.getFullYear() === thisYear;
        });
        setCount(closing.length);
      })
      .catch(() => setCount(0));
  }, []);

  if (!count) return null;

  return (
    <button
      onClick={onFilter}
      className="w-full text-left mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 hover:bg-amber-100 hover:border-amber-300 transition-colors"
    >
      <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="text-sm font-medium text-amber-700">
        {count} deal{count !== 1 ? 's' : ''} closing this month
      </span>
      <span className="text-xs text-amber-600 ml-auto">Click to filter &rarr;</span>
    </button>
  );
}

function RecentActivity() {
  const [recentDeals, setRecentDeals] = useState<Deal[]>([]);

  useEffect(() => {
    fetch('/api/deals?sort=updated_at&order=desc&limit=5')
      .then((r) => r.json())
      .then((data) => setRecentDeals((data.deals || []).slice(0, 5)))
      .catch(() => {});
  }, []);

  if (recentDeals.length === 0) return null;

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  const stageBadgeClass: Record<string, string> = {
    Prospecting: 'bg-slate-100 text-slate-600 border-slate-200',
    'Pre-Approval': 'bg-blue-50 text-blue-600 border-blue-200',
    Showings: 'bg-violet-50 text-violet-600 border-violet-200',
    'Offer Submitted': 'bg-amber-50 text-amber-600 border-amber-200',
    'Under Contract': 'bg-orange-50 text-orange-600 border-orange-200',
    Inspection: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    Appraisal: 'bg-teal-50 text-teal-600 border-teal-200',
    Closing: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    Sold: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Lost: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Recent Activity</h2>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
        {recentDeals.map((deal) => (
          <div key={deal.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-[#1a1a2e] font-medium truncate block">{deal.contact_name}</span>
              {deal.property_address && (
                <span className="text-xs text-gray-500 truncate block">{deal.property_address}</span>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${stageBadgeClass[deal.stage] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {deal.stage}
            </span>
            <span className="text-xs text-gray-400 font-mono flex-shrink-0 w-16 text-right">{timeAgo(deal.updated_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DealsPageInner() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [filterClosingMonth, setFilterClosingMonth] = useState(false);
  const { user, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const { openCommandPalette } = useShortcuts();

  // Read URL params for pre-filling new deal form
  const newDealParam = searchParams.get('new');
  const prefillName = searchParams.get('contact_name') ?? '';
  const prefillEmail = searchParams.get('contact_email') ?? '';
  const prefillPhone = searchParams.get('contact_phone') ?? '';

  const shouldOpenNewDeal = newDealParam === '1';

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#1a1a2e]">Deals</h1>
            <ClientSelector value={clientId} onChange={setClientId} showAll={isAdmin} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openCommandPalette}
              className="bg-white border border-gray-300 text-gray-500 text-xs px-2 py-1 rounded hover:border-gray-400 hover:text-[#33475b] transition-colors"
            >
              {'\u2318'}K
            </button>
            <span className="text-sm text-gray-500">{user?.email}</span>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        <ClosingThisMonthBanner onFilter={() => setFilterClosingMonth(true)} />
        <DealsPipeline
          clientId={clientId}
          filterClosingMonth={filterClosingMonth}
          onClearFilter={() => setFilterClosingMonth(false)}
          initialOpenNewDeal={shouldOpenNewDeal}
          initialValues={shouldOpenNewDeal ? { contact_name: prefillName, contact_email: prefillEmail, contact_phone: prefillPhone } : undefined}
        />
        <RecentActivity />
      </main>
    </>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <DealsPageInner />
    </Suspense>
  );
}
