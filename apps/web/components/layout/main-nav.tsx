'use client';

import {
  Bars3Icon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  FolderIcon,
  HomeIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';

import { Logo } from '@/components/brand/logo';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { PRIMARY_NAVIGATION, isActivePath } from '@/lib/navigation';

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  '/dashboard': HomeIcon,
  '/projects': FolderIcon,
  '/audits': ClipboardDocumentCheckIcon,
  '/settings': Cog6ToothIcon,
};

function NavLinks({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary">
      <ul className="space-y-0.5">
        {PRIMARY_NAVIGATION.map((item) => {
          const active =
            isActivePath(pathname, item.href) &&
            !(item.href === '/audits' && pathname === '/audits/new');
          const Icon = ICONS[item.href];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white text-zinc-950 shadow-card ring-1 ring-zinc-950/[0.07]'
                    : 'text-zinc-600 hover:bg-zinc-950/[0.04] hover:text-zinc-950',
                )}
              >
                {Icon ? (
                  <Icon
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0',
                      active ? 'text-brand-600' : 'text-zinc-400 group-hover:text-zinc-500',
                    )}
                  />
                ) : null}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarContent({ footer, onNavigate }: { footer: ReactNode; onNavigate: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <Link href="/dashboard" onClick={onNavigate} className="rounded-lg px-1.5 py-1">
        <Logo />
      </Link>
      <Link
        href="/audits/new"
        onClick={onNavigate}
        className={buttonClass('primary', 'md', 'w-full justify-start')}
      >
        <PlusIcon aria-hidden />
        New audit
      </Link>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto">{footer}</div>
    </div>
  );
}

/** Fixed sidebar on large screens; a top bar with a slide-in drawer below that. */
export function MainNav({ footer }: { footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-zinc-950/[0.06] bg-zinc-100/60 lg:block">
        <SidebarContent footer={footer} onNavigate={close} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-950/[0.06] bg-white/80 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-sidebar"
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-950/5"
        >
          <Bars3Icon aria-hidden className="size-5" />
          <span className="sr-only">Open navigation</span>
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" key={pathname}>
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px]"
            onClick={close}
          />
          <aside
            id="mobile-sidebar"
            className="absolute inset-y-0 left-0 w-72 animate-fade-up bg-zinc-50 shadow-raised"
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-950/5"
            >
              <XMarkIcon aria-hidden className="size-5" />
              <span className="sr-only">Close navigation</span>
            </button>
            <SidebarContent footer={footer} onNavigate={close} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
