'use client';

import { Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import ListingsGrid from '@/components/listings-grid';
import { useShortcuts } from '@/components/shortcuts-provider';

function ListingsPageInner() {
  const { user } = useAuth();
  const { openCommandPalette } = useShortcuts();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#1a1a2e]">Listings</h1>
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
        <ListingsGrid />
      </main>
    </>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <ListingsPageInner />
    </Suspense>
  );
}
