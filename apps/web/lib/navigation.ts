export interface NavigationItem {
  href: string;
  label: string;
}

export const PRIMARY_NAVIGATION: readonly NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/audits', label: 'Audits' },
  { href: '/settings', label: 'Settings' },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
