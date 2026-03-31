'use client';

import type { ReactNode } from 'react';
import ShortcutsProvider from '@/components/shortcuts-provider';
import AppLayout from '@/components/app-layout';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ShortcutsProvider>
      <AppLayout>{children}</AppLayout>
    </ShortcutsProvider>
  );
}
