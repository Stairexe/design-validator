import type { Metadata } from 'next';

import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Workspace and integration settings." />
      <EmptyState title="Nothing to configure yet">
        Comparison tolerances and design-tool connections will be configured here.
      </EmptyState>
    </>
  );
}
