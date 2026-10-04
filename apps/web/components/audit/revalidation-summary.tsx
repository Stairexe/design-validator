import { formatValue, propertyLabel, type ValidationIssue } from '@design-validator/design-spec';
import type { RevalidationDiff } from '@design-validator/pipeline';
import { ArrowPathIcon, CheckCircleIcon, PlusCircleIcon } from '@heroicons/react/16/solid';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const line = (issue: ValidationIssue) => (
  <>
    <span className="font-medium text-zinc-800">{issue.element.name}</span> ·{' '}
    {propertyLabel(issue.property)}{' '}
    <span className="font-mono text-[11px] text-zinc-400">{issue.viewportId}</span>
  </>
);

function Column({
  title,
  count,
  icon,
  tone,
  children,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  tone: 'success' | 'neutral' | 'danger';
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 px-5 py-4">
      <h3
        className={cn(
          'flex items-center gap-1.5 text-sm font-semibold',
          tone === 'success' && 'text-emerald-700',
          tone === 'neutral' && 'text-zinc-800',
          tone === 'danger' && 'text-red-700',
        )}
      >
        {icon}
        {title}
        <span className="ml-auto text-xl tabular-nums">{count}</span>
      </h3>
      <ul className="mt-2 space-y-1 text-[13px] text-zinc-600">{children}</ul>
    </div>
  );
}

/** What changed since the audit this one re-validates (Phase 11). */
export function RevalidationSummary({
  parentId,
  diff,
}: {
  parentId: string;
  diff: RevalidationDiff;
}) {
  const changed = diff.persisting.filter((entry) => entry.changed);
  return (
    <Card className="mb-6 animate-fade-up overflow-hidden">
      <CardHeader
        icon={<ArrowPathIcon />}
        title="Since the previous audit"
        description={
          <>
            Compared with{' '}
            <Link
              href={`/audits/${parentId}`}
              className="font-medium text-brand-600 underline-offset-2 hover:underline"
            >
              the audit this re-validates
            </Link>
            .
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] divide-y divide-zinc-950/[0.06] md:grid-cols-3 md:divide-x md:divide-y-0">
        <Column
          title="Resolved"
          count={diff.resolved.length}
          tone="success"
          icon={<CheckCircleIcon aria-hidden className="size-4" />}
        >
          {diff.resolved.slice(0, 12).map((issue) => (
            <li key={issue.id} className="truncate">
              {line(issue)}
            </li>
          ))}
        </Column>
        <Column
          title="Still different"
          count={diff.persisting.length}
          tone="neutral"
          icon={<ArrowPathIcon aria-hidden className="size-4 text-zinc-400" />}
        >
          {changed.slice(0, 12).map(({ before, after }) => (
            <li key={after.id}>
              <span className="block truncate">{line(after)}</span>
              <span className="font-mono text-[11px] text-zinc-500">
                {formatValue(before.current)} → {formatValue(after.current)} (required{' '}
                {formatValue(after.required)})
              </span>
            </li>
          ))}
          {diff.persisting.length > changed.length ? (
            <li className="text-zinc-400">{diff.persisting.length - changed.length} unchanged</li>
          ) : null}
        </Column>
        <Column
          title="New"
          count={diff.introduced.length}
          tone="danger"
          icon={<PlusCircleIcon aria-hidden className="size-4" />}
        >
          {diff.introduced.slice(0, 12).map((issue) => (
            <li key={issue.id} className="truncate">
              {line(issue)}
            </li>
          ))}
        </Column>
      </div>
    </Card>
  );
}
