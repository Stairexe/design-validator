import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';

import { EmptyState } from '@/components/layout/empty-state';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={<MagnifyingGlassIcon />}
        title="Page not found"
        action={
          <div className="flex gap-2">
            <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
            <ButtonLink href="/projects" variant="secondary">
              Projects
            </ButtonLink>
          </div>
        }
      >
        This page doesn&apos;t exist, or the project or audit was deleted.
      </EmptyState>
    </Card>
  );
}
