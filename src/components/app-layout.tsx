'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import AppSidebar from '@/components/app-sidebar';

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname.startsWith('/login');

  // Don't wrap login routes with auth/sidebar
  if (isLoginRoute) {
    return <>{children}</>;
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, handleLogout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        isAdmin={isAdmin}
        onLogout={handleLogout}
        userEmail={user?.email}
      />
      <div className="ml-[60px] flex-1">{children}</div>
    </div>
  );
}
