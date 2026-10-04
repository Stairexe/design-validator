'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { PRIMARY_NAVIGATION, isActivePath } from '@/lib/navigation';

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary">
      <ul className="flex gap-1">
        {PRIMARY_NAVIGATION.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
