import {
  ISSUE_SEVERITIES,
  type IssueSeverity,
  type ValidationIssue,
} from '@design-validator/design-spec';
import { CheckBadgeIcon } from '@heroicons/react/20/solid';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { CATEGORY_LABELS } from '@/lib/labels';

export const SEVERITY_BAR: Record<IssueSeverity, string> = {
  critical: 'bg-red-600',
  high: 'bg-red-400',
  medium: 'bg-pop-500',
  low: 'bg-zinc-300',
  info: 'bg-brand-300',
};

/** Counts that orient the reader. Deliberately no aggregate rating (product rule 1). */
export function AuditSummary({
  issues,
  viewportCount,
}: {
  issues: ValidationIssue[];
  viewportCount: number;
}) {
  if (issues.length === 0) {
    return (
      <Card className="mb-6 flex animate-fade-up items-center gap-4 border-2 border-zinc-950 bg-zest-200 p-5 shadow-hard-lg">
        <span className="flex size-12 -rotate-6 items-center justify-center rounded-2xl border-2 border-zinc-950 bg-white text-zinc-950 shadow-hard-sm">
          <CheckBadgeIcon aria-hidden className="size-5" />
        </span>
        <div>
          <p className="font-display text-xl font-bold text-zinc-950">
            The page matches the design
          </p>
          <p className="text-sm text-zinc-700">
            No differences beyond the tolerances on {viewportCount} screen size
            {viewportCount === 1 ? '' : 's'}.
          </p>
        </div>
      </Card>
    );
  }

  const bySeverity = new Map<IssueSeverity, number>();
  const byCategory = new Map<string, number>();
  const elements = new Set<string>();
  for (const issue of issues) {
    bySeverity.set(issue.severity, (bySeverity.get(issue.severity) ?? 0) + 1);
    byCategory.set(issue.category, (byCategory.get(issue.category) ?? 0) + 1);
    elements.add(
      `${issue.viewportId}|${issue.element.designId ?? ''}|${issue.element.implementationId ?? ''}`,
    );
  }
  const urgent = (bySeverity.get('critical') ?? 0) + (bySeverity.get('high') ?? 0);
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const tiles = [
    { label: 'Differences', value: issues.length, color: 'bg-zest-300' },
    { label: 'High priority', value: urgent, color: urgent > 0 ? 'bg-pop-500' : 'bg-white' },
    { label: 'Elements affected', value: elements.size, color: 'bg-brand-200' },
    { label: 'Screen sizes', value: viewportCount, color: 'bg-sky-200' },
  ];

  return (
    <section className="mb-8 animate-fade-up overflow-hidden rounded-2xl border-2 border-zinc-950 bg-white shadow-hard-lg">
      <dl className="grid grid-cols-2 sm:grid-cols-4">
        {tiles.map((tile, index) => (
          <div
            key={tile.label}
            className={cn(
              'border-zinc-950 px-5 py-4',
              tile.color,
              index % 2 === 1 && 'border-l-2',
              index >= 2 && 'border-t-2 sm:border-t-0',
              index === 2 && 'sm:border-l-2',
            )}
          >
            <dt className="text-[13px] font-semibold text-zinc-950/70">{tile.label}</dt>
            <dd className="mt-1 font-display text-[40px] font-bold leading-none tracking-tight text-zinc-950 tabular-nums">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="space-y-3 border-t-2 border-zinc-950 px-5 py-4">
        <div
          className="flex h-4 gap-[3px] overflow-hidden rounded-full border-2 border-zinc-950 bg-zinc-950"
          role="img"
          aria-label={ISSUE_SEVERITIES.filter((s) => bySeverity.has(s))
            .map((s) => `${bySeverity.get(s) ?? 0} ${s}`)
            .join(', ')}
        >
          {ISSUE_SEVERITIES.filter((s) => bySeverity.has(s)).map((severity) => (
            <span
              key={severity}
              className={cn('h-full', SEVERITY_BAR[severity])}
              style={{ flexGrow: bySeverity.get(severity) ?? 0 }}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-zinc-500">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {ISSUE_SEVERITIES.filter((s) => bySeverity.has(s)).map((severity) => (
              <li key={severity} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    'size-2.5 rounded-full border border-zinc-950',
                    SEVERITY_BAR[severity],
                  )}
                />
                <span className="font-semibold capitalize text-zinc-700">{severity}</span>
                <span className="font-mono font-bold text-zinc-950 tabular-nums">
                  {bySeverity.get(severity)}
                </span>
              </li>
            ))}
          </ul>
          <p>
            Mostly{' '}
            {topCategories.map(([category, count], index) => (
              <span key={category}>
                {index > 0 ? (index === topCategories.length - 1 ? ' and ' : ', ') : ''}
                <span className="font-medium text-zinc-700">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS].toLowerCase()}
                </span>{' '}
                ({count})
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
