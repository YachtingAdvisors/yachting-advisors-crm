'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Contact,
  Handshake,
  Activity,
  CheckSquare,
  BarChart3,
  Settings,
  X,
  Anchor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClient } from '@/contexts/client-context';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/contacts', label: 'Contacts', icon: Contact },
  { href: '/deals', label: 'Deals', icon: Handshake },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { isAdminUser } = useClient();

  if (!open) return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const items = isAdminUser
    ? [...navItems, { href: '/settings', label: 'Settings', icon: Settings }]
    : navItems;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 w-[260px] bg-sidebar border-r border-sidebar-border z-50 lg:hidden flex flex-col animate-slide-in-left">
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg gold-gradient">
              <Anchor className="w-5 h-5 text-navy" />
            </div>
            <span className="font-semibold text-foreground text-sm">Yachting Advisors</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                  active
                    ? 'bg-sidebar-accent text-gold'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gold" />
                )}
                <item.icon className={cn('w-5 h-5', active && 'text-gold')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
