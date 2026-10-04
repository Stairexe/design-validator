import type { ReactNode } from 'react';

import { MainNav } from './main-nav';
import { SidebarStatus } from './sidebar-status';
import { StorageWarning } from './storage-warning';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-raised"
      >
        Skip to content
      </a>
      <MainNav footer={<SidebarStatus />} />
      <div className="lg:pl-60">
        <main id="main" className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <StorageWarning />
          {children}
        </main>
      </div>
    </div>
  );
}
