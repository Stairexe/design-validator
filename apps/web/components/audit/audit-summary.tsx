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
  medium: 'bg-amber-400',
  low: 'bg-zinc-300',
  info: 'bg-brand-200',
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
      <Card className="mb-6 flex animate-fade-up items-center gap-4 p-5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckBadgeIcon aria-hidden className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-zinc-950">The page matches the design</p>
          <p className="text-sm text-zinc-500">
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
    { label: 'Differences', value: issues.length },
    { label: 'High priority', value: urgent, accent: urgent > 0 },
    { label: 'Elements affected', value: elements.size },
    { label: 'Screen sizes', value: viewportCount },
  ];

  return (
    <Card className="mb-6 animate-fade-up overflow-hidden">
      <dl className="grid grid-cols-2 divide-zinc-950/[0.06] sm:grid-cols-4 sm:divide-x">
        {tiles.map((tile) => (
          <div key={tile.label} className="px-5 py-4">
            <dt className="text-[13px] font-medium text-zinc-500">{tile.label}</dt>
            <dd
              className={cn(
                'mt-1 text-2xl font-semibold tracking-tight tabular-nums',
                tile.accent ? 'text-red-600' : 'text-zinc-950',
              )}
            >
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2.5 border-t border-zinc-950/[0.06] px-5 py-4">
        <div
          className="flex h-2 gap-0.5 overflow-hidden rounded-full"
          role="img"
          aria-label={ISSUE_SEVERITIES.filter((s) => bySeverity.has(s))
            .map((s) => `${bySeverity.get(s) ?? 0} ${s}`)
            .join(', ')}
        >
          {ISSUE_SEVERITIES.filter((s) => bySeverity.has(s)).map((severity) => (
            <span
              key={severity}
              className={cn(
                'h-full first:rounded-l-full last:rounded-r-full',
                SEVERITY_BAR[severity],
              )}
              style={{ flexGrow: bySeverity.get(severity) ?? 0 }}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-zinc-500">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {ISSUE_SEVERITIES.filter((s) => bySeverity.has(s)).map((severity) => (
              <li key={severity} className="flex items-center gap-1.5">
                <span aria-hidden className={cn('size-2 rounded-full', SEVERITY_BAR[severity])} />
                <span className="capitalize">{severity}</span>
                <span className="font-medium text-zinc-700 tabular-nums">
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
    </Card>
  );
}
