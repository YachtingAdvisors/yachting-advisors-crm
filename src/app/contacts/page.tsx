'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/types';
import ContactsTable from '@/components/contacts-table';
import ClientSelector from '@/components/client-selector';
import { useShortcuts } from '@/components/shortcuts-provider';

export default function ContactsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const router = useRouter();
  const { openCommandPalette } = useShortcuts();

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
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
                Contacts
              </button>
              <button
                onClick={() => router.push('/analytics')}
                className="px-4 py-2 text-sm text-gray-500 hover:text-[#1a1a2e] transition-colors"
              >
                Analytics
              </button>
            </nav>
            <button
              onClick={openCommandPalette}
              className="bg-white border border-gray-300 text-gray-500 text-xs px-2 py-1 rounded hover:border-gray-400 hover:text-gray-600 transition-colors"
            >
              {'\u2318'}K
            </button>
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <ContactsTable clientId={clientId} />
      </main>
    </div>
  );
}
