'use client';

import type { ReactNode } from 'react';
import ShortcutsProvider from '@/components/shortcuts-provider';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <ShortcutsProvider>{children}</ShortcutsProvider>;
}
