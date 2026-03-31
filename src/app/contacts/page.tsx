'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import ContactsTable from '@/components/contacts-table';
import ClientSelector from '@/components/client-selector';
import { useShortcuts } from '@/components/shortcuts-provider';

export default function ContactsPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();
  const { openCommandPalette } = useShortcuts();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#1a1a2e]">Contacts</h1>
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <ContactsTable clientId={clientId} />
      </main>
    </>
  );
}
