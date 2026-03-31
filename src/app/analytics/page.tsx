'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import AnalyticsDashboard from '@/components/analytics-dashboard';
import ClientSelector from '@/components/client-selector';

export default function AnalyticsPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[#1a1a2e]">Analytics</h1>
            <ClientSelector value={clientId} onChange={setClientId} showAll={isAdmin} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <AnalyticsDashboard clientId={clientId} />
      </main>
    </>
  );
}
