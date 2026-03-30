'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { isAdmin, Deal } from '@/lib/types';
import DealsPipeline from '@/components/deals-pipeline';
import ClientSelector from '@/components/client-selector';

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
      className="w-full text-left mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors"
    >
      <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="text-sm font-medium text-amber-400">
        {count} deal{count !== 1 ? 's' : ''} closing this month
      </span>
      <span className="text-xs text-amber-500 ml-auto">Click to filter →</span>
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
    Prospecting: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'Pre-Approval': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Showings: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    'Offer Submitted': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Under Contract': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Inspection: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    Appraisal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    Closing: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    Sold: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Recent Activity</h2>
      <div className="bg-[#141620] border border-gray-800 rounded-xl divide-y divide-gray-800/50">
        {recentDeals.map((deal) => (
          <div key={deal.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-white font-medium truncate block">{deal.contact_name}</span>
              {deal.property_address && (
                <span className="text-xs text-gray-500 truncate block">{deal.property_address}</span>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${stageBadgeClass[deal.stage] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
              {deal.stage}
            </span>
            <span className="text-xs text-gray-600 font-mono flex-shrink-0 w-16 text-right">{timeAgo(deal.updated_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DealsPageInner() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [filterClosingMonth, setFilterClosingMonth] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL params for pre-filling new deal form
  const newDealParam = searchParams.get('new');
  const prefillName = searchParams.get('contact_name') ?? '';
  const prefillEmail = searchParams.get('contact_email') ?? '';
  const prefillPhone = searchParams.get('contact_phone') ?? '';

  const shouldOpenNewDeal = newDealParam === '1';

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        setLoading(false);
      }
    });
  }, [router]);

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const admin = isAdmin(user?.email);

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">Real Estate CRM</h1>
            <ClientSelector value={clientId} onChange={setClientId} showAll={admin} />
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1 bg-[#141620] border border-gray-700 rounded-lg overflow-hidden mr-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Leads
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-600 text-white"
              >
                Deals
              </button>
            </nav>
            {admin && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-sm bg-[#141620] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              >
                Settings
              </button>
            )}
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
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
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <DealsPageInner />
    </Suspense>
  );
}
