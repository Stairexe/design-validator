import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
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

export const viewport: Viewport = { themeColor: '#fafafa' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-zinc-50 font-sans text-zinc-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
