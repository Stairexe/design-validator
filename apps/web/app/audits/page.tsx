import type { Metadata } from 'next';

import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = { title: 'Audits' };

export default function AuditsPage() {
  return (
    <>
      <PageHeader
        title="Audits"
        description="Each audit lists measured differences per viewport."
      />
      <EmptyState title="No audits yet">
        Completed audits will appear here with their differences grouped by element.
      </EmptyState>
    </>
  );
}
