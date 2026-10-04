import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/instrument-sans';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';

import '../styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Design Validator',
    template: '%s · Design Validator',
  },
  description: 'Exact differences between a live website and its Figma or Adobe XD design.',
};

export const viewport: Viewport = { themeColor: '#16131b' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-zinc-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
