'use client';

import { formatValue, propertyLabel, type ValidationIssue } from '@design-validator/design-spec';

import { cn } from '@/lib/cn';

const SEVERITY_DOT: Record<ValidationIssue['severity'], string> = {
  critical: 'bg-red-600',
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-zinc-400',
  info: 'bg-blue-400',
};

/** One-line "what changes" summary: `Padding X 20px → 24px`. */
export function issueSummary(issue: ValidationIssue): string {
  return `${propertyLabel(issue.property)}  ${formatValue(issue.current)} → ${formatValue(issue.required)}`;
}

/** Issues grouped by element, in report order. */
export function IssueList({
  issues,
  selectedId,
  onSelect,
}: {
  issues: ValidationIssue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const groups = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    const key = `${issue.viewportId}|${issue.element.designId ?? ''}|${issue.element.implementationId ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), issue]);
  }

  if (issues.length === 0) {
    return <p className="p-4 text-sm text-zinc-600">No differences match the current filters.</p>;
  }
  return (
    <ul aria-label="Differences" className="divide-y divide-zinc-100">
      {[...groups.entries()].map(([key, members]) => {
        const first = members[0];
        if (!first) return null;
        return (
          <li key={key} className="py-2">
            <div className="flex items-baseline justify-between gap-2 px-3">
              <span className="truncate text-sm font-semibold" title={first.element.name}>
                {first.element.name}
              </span>
              <span className="shrink-0 text-xs text-zinc-500">{first.viewportId}</span>
            </div>
            <ul className="mt-1">
              {members.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(issue.id)}
                    aria-current={issue.id === selectedId ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs',
                      issue.id === selectedId
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-800 hover:bg-zinc-100',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn('size-2 shrink-0 rounded-full', SEVERITY_DOT[issue.severity])}
                    />
                    <span className="sr-only">{issue.severity} severity:</span>
                    <span className="truncate">{issueSummary(issue)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
