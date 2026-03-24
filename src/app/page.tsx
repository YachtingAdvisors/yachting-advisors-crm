'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/types';
import LeadsTable from '@/components/leads-table';
import ClientSelector from '@/components/client-selector';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
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

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/meta/sync', { method: 'POST' });
      const data = await res.json();
      alert(`Synced ${data.synced} leads${data.errors ? ` (${data.errors} errors)` : ''}`);
      window.location.reload();
    } catch {
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

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
      {/* Top bar */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">Yachting Advisors CRM</h1>
            <ClientSelector
              value={clientId}
              onChange={setClientId}
              showAll={admin}
            />
          </div>
          <div className="flex items-center gap-3">
            {admin && (
              <>
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 text-sm bg-[#141620] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-4 py-2 text-sm bg-[#141620] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Sync Meta Leads'}
                </button>
              </>
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

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <LeadsTable clientId={clientId} />
      </main>
    </div>
  );
}
