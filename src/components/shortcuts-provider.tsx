'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import CommandPalette from '@/components/command-palette';
import KeyboardShortcutsHelp from '@/components/keyboard-shortcuts-help';

interface ShortcutsContextValue {
  openCommandPalette: () => void;
  openShortcutsHelp: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue>({
  openCommandPalette: () => {},
  openShortcutsHelp: () => {},
});

export function useShortcuts() {
  return useContext(ShortcutsContext);
}

export default function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingKeyRef = useRef<{ key: string; time: number } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const openCommandPalette = useCallback(() => {
    setHelpOpen(false);
    setPaletteOpen(true);
  }, []);

  const openShortcutsHelp = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Cmd+K / Ctrl+K - always works
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // Skip other shortcuts when in input fields or modals are open
      if (isInput || paletteOpen || helpOpen) return;

      // ? - show shortcuts help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        openShortcutsHelp();
        return;
      }

      // N - new deal (only on /deals page)
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && pathname === '/deals') {
        // Dispatch a custom event that DealsPipeline can listen for
        window.dispatchEvent(new CustomEvent('shortcut:new-deal'));
        return;
      }

      // G-sequence shortcuts (vim-style)
      const now = Date.now();
      const pending = pendingKeyRef.current;

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        pendingKeyRef.current = { key: 'g', time: now };
        return;
      }

      if (pending && pending.key === 'g' && now - pending.time < 500) {
        pendingKeyRef.current = null;
        if (e.key === 'l') {
          e.preventDefault();
          router.push('/');
          return;
        }
        if (e.key === 'd') {
          e.preventDefault();
          router.push('/deals');
          return;
        }
      }

      // Reset pending if no match
      pendingKeyRef.current = null;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openCommandPalette, openShortcutsHelp, paletteOpen, helpOpen, router, pathname]);

  return (
    <ShortcutsContext.Provider value={{ openCommandPalette, openShortcutsHelp }}>
      {children}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </ShortcutsContext.Provider>
  );
}
