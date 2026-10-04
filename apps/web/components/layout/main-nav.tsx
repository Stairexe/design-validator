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
                  'group flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-[15px] font-semibold transition-all',
                  active
                    ? 'border-zinc-950 bg-zest-300 text-zinc-950 shadow-[3px_3px_0_0_var(--color-pop-500)]'
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white',
                )}
              >
                {Icon ? (
                  <Icon
                    aria-hidden
                    className={cn(
                      'size-[18px] shrink-0 transition-transform group-hover:scale-110',
                      active ? 'text-zinc-950' : 'text-zinc-500 group-hover:text-pop-300',
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
    <div className="flex h-full flex-col gap-7 px-4 py-5">
      <Link href="/dashboard" onClick={onNavigate} className="rounded-lg px-1 py-1">
        <Logo inverted />
      </Link>
      <Link
        href="/audits/new"
        onClick={onNavigate}
        className={buttonClass(
          'primary',
          'lg',
          'w-full justify-start shadow-[3px_3px_0_0_var(--color-zest-300)] hover:shadow-[5px_5px_0_0_var(--color-zest-300)]',
        )}
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-zinc-950 lg:block">
        <SidebarContent footer={footer} onNavigate={close} />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-2 border-zinc-950 bg-zinc-950 px-4 lg:hidden">
        <Link href="/dashboard">
          <Logo inverted />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-sidebar"
          className="rounded-xl border-2 border-zinc-700 p-2 text-white hover:border-zest-300 hover:text-zest-300"
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
            className="absolute inset-y-0 left-0 w-72 animate-fade-up bg-zinc-950 shadow-raised"
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
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
