'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useClient } from '@/contexts/client-context';
import { createBrowserClient } from '@/lib/supabase';

const pathLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/contacts': 'Contacts',
  '/deals': 'Deals',
  '/activities': 'Activities',
  '/tasks': 'Tasks',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function TopBar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clients, clientId, setClientId, isAdminUser } = useClient();

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.length === 0
    ? [{ label: 'Dashboard', href: '/' }]
    : segments.map((seg, i) => ({
        label: pathLabels['/' + seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
        href: '/' + segments.slice(0, i + 1).join('/'),
      }));

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??';

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Client selector */}
        {(clients.length > 1 || isAdminUser) && (
          <Select value={clientId || ''} onValueChange={setClientId}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="rounded-full" />}
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gold/20 text-gold text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {isAdminUser ? 'Administrator' : 'User'}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
