import type { Metadata } from 'next';

import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="See exactly what to change so a website matches its design."
      />
      <EmptyState title="No audits yet">
        Audits compare a rendered website against a Figma or Adobe XD design and list each
        difference as a current value, a required value and the change needed.
      </EmptyState>
    </>
  );
}
