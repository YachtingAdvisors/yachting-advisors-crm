'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppSidebarProps {
  isAdmin: boolean;
  onLogout: () => void;
  userEmail?: string | null;
}

const navItems = [
  {
    label: 'Leads',
    href: '/',
    tourId: 'nav-leads',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: 'Deals',
    href: '/deals',
    tourId: 'nav-deals',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Contacts',
    href: '/contacts',
    tourId: 'nav-contacts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h6" />
      </svg>
    ),
  },
  {
    label: 'Listings',
    href: '/listings',
    tourId: 'nav-listings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5h16.5m-16.5 0c0 2.485 2.015 4.5 4.5 4.5h7.5c2.485 0 4.5-2.015 4.5-4.5m-16.5 0L2.25 12l2.25-3h15l2.25 3-1.5 1.5M8.25 6.75V3.75a1.5 1.5 0 011.5-1.5h4.5a1.5 1.5 0 011.5 1.5v3" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    href: '/analytics',
    tourId: 'nav-analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export default function AppSidebar({ isAdmin, onLogout, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const firstLetter = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

  return (
    <aside data-tour="sidebar" className="fixed left-0 top-0 h-screen w-[60px] bg-[#2d3e50] flex flex-col items-center z-40">
      {/* Brand */}
      <div className="py-4 flex items-center justify-center">
        <span className="text-[#ff7a59] font-bold text-lg">RE</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col items-center w-full pt-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              data-tour={item.tourId}
              className={`w-full py-3 flex flex-col items-center gap-1 transition-colors relative ${
                active
                  ? 'text-white bg-white/15'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#ff7a59]" />
              )}
              {item.icon}
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto flex flex-col items-center w-full pb-3">
        {/* Settings (admin only) */}
        {isAdmin && (
          <Link
            href="/admin"
            title="Settings"
            className={`w-full py-3 flex flex-col items-center gap-1 transition-colors relative ${
              isActive(pathname, '/admin')
                ? 'text-white bg-white/15'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {isActive(pathname, '/admin') && (
              <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#ff7a59]" />
            )}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] leading-tight">Settings</span>
          </Link>
        )}

        {/* Help / Tour */}
        <button
          onClick={() => {
            try {
              localStorage.removeItem('crm-onboarding-complete');
              window.location.reload();
            } catch { /* ignore */ }
          }}
          title="Take a Tour"
          className="w-full py-2.5 flex flex-col items-center gap-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          <span className="text-[10px] leading-tight">Help</span>
        </button>

        {/* Sign out */}
        <button
          onClick={onLogout}
          title="Sign Out"
          className="w-full py-3 flex flex-col items-center gap-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          <span className="text-[10px] leading-tight">Sign Out</span>
        </button>

        {/* User avatar */}
        <div className="mt-1 mb-1" title={userEmail || ''}>
          <div className="w-8 h-8 rounded-full bg-[#ff7a59] flex items-center justify-center text-white text-xs font-semibold">
            {firstLetter}
          </div>
        </div>
      </div>
    </aside>
  );
}
