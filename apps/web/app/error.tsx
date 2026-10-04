'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/20/solid';

import { EmptyState } from '@/components/layout/empty-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={<ExclamationTriangleIcon className="text-amber-500" />}
        title="This page could not load"
        action={
          <div className="flex gap-2">
            <Button onClick={() => retry()}>Try again</Button>
            <ButtonLink href="/dashboard" variant="secondary">
              Dashboard
            </ButtonLink>
          </div>
        }
      >
        Something failed on the server. Your projects and audits are not affected.
        {error.digest ? (
          <span className="mt-2 block font-mono text-xs text-zinc-400">Ref {error.digest}</span>
        ) : null}
      </EmptyState>
    </Card>
  );
}
