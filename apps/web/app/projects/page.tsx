import type { Metadata } from 'next';

import { EmptyState } from '@/components/layout/empty-state';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = { title: 'Projects' };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        description="A project pairs a website URL with its design revisions."
      />
      <EmptyState title="No projects yet">
        Projects will hold the website URL, design sources and audit history.
      </EmptyState>
    </>
  );
}
