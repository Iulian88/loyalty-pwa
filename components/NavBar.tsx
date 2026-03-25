'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavBarProps {
  role: 'client' | 'operator';
}

const ScissorsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z"/>
  </svg>
);

const QrIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2zM21 13h-2v2h2z"/>
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const clientNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Card', icon: <ScissorsIcon /> },
  { href: '/show-qr', label: 'My QR', icon: <QrIcon /> },
];

const operatorNavItems: NavItem[] = [
  { href: '/operator/dashboard', label: 'Home',       icon: <HomeIcon /> },
  { href: '/operator/clients',   label: 'Clienți',   icon: <PeopleIcon /> },
  { href: '/operator/scan-qr',   label: 'Scan QR',   icon: <QrIcon /> },
  { href: '/operator/activity',  label: 'Activitate', icon: <ActivityIcon /> },
];

export default function NavBar({ role }: NavBarProps) {
  const pathname = usePathname();
  const items = role === 'client' ? clientNavItems : operatorNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="glass-card border-t border-[var(--border)] border-l-0 border-r-0 border-b-0">
        <div className="flex items-center justify-around px-2 py-3">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-all duration-200
                  ${active
                    ? 'text-[var(--gold)]'
                    : 'text-[var(--muted)] hover:text-[var(--text-dim)]'
                  }`}
              >
                <div className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-xs font-medium tracking-wide">{item.label}</span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-[var(--gold)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
