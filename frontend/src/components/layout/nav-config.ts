import {
  LayoutDashboard,
  FolderTree,
  MapPin,
  Tag,
  CalendarClock,
  ClipboardList,
  BadgePercent,
  Phone,
  Home,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export type NavKey =
  | 'dashboard'
  | 'categories'
  | 'zones'
  | 'offers'
  | 'availability'
  | 'bookings'
  | 'promotions'
  | 'settingsContact'
  | 'settingsHome'
  | 'admin';

export type NavSection = 'main' | 'catalog' | 'operations' | 'settings';

export type NavItem = {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  section: NavSection;
};

export const navSections: NavSection[] = ['main', 'catalog', 'operations', 'settings'];

export const navItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, enabled: true, section: 'main' },
  { key: 'categories', href: '/dashboard/categories', icon: FolderTree, enabled: true, section: 'catalog' },
  { key: 'zones', href: '/dashboard/zones', icon: MapPin, enabled: true, section: 'catalog' },
  { key: 'offers', href: '/dashboard/offers', icon: Tag, enabled: true, section: 'catalog' },
  { key: 'bookings', href: '/dashboard/bookings', icon: ClipboardList, enabled: true, section: 'operations' },
  { key: 'availability', href: '/dashboard/availability', icon: CalendarClock, enabled: true, section: 'operations' },
  { key: 'promotions', href: '/dashboard/promotions', icon: BadgePercent, enabled: true, section: 'operations' },
  { key: 'settingsContact', href: '/dashboard/settings/contact', icon: Phone, enabled: true, section: 'settings' },
  { key: 'settingsHome', href: '/dashboard/settings/homepage', icon: Home, enabled: true, section: 'settings' },
  { key: 'admin', href: '/dashboard/account', icon: ShieldCheck, enabled: true, section: 'settings' },
];

export function isNavActive(item: NavItem, pathname: string, locale: string): boolean {
  const href = `/${locale}${item.href}`;
  return item.href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}