'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/types';
import AnalyticsDashboard from '@/components/analytics-dashboard';
import ClientSelector from '@/components/client-selector';

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const router = useRouter();

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
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#1a1a2e]">Real Estate CRM</h1>
            <ClientSelector value={clientId} onChange={setClientId} showAll={admin} />
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1 bg-white border border-gray-300 rounded-lg overflow-hidden mr-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm text-gray-500 hover:text-[#1a1a2e] transition-colors"
              >
                Leads
              </button>
              <button
                onClick={() => router.push('/deals')}
                className="px-4 py-2 text-sm text-gray-500 hover:text-[#1a1a2e] transition-colors"
              >
                Deals
              </button>
              <button
                className="px-4 py-2 text-sm bg-[#ff7a59] text-white"
              >
                Analytics
              </button>
            </nav>
            {admin && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-[#1a1a2e] hover:border-gray-400 transition-colors"
              >
                Settings
              </button>
            )}
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-[#1a1a2e] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <AnalyticsDashboard clientId={clientId} />
      </main>
    </div>
  );
}
