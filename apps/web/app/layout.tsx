import type { Metadata } from 'next';
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
