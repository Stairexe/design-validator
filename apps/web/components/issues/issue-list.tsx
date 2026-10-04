'use client';

import {
  formatDelta,
  formatValue,
  propertyLabel,
  type ValidationIssue,
} from '@design-validator/design-spec';

import { cn } from '@/lib/cn';

export const SEVERITY_DOT: Record<ValidationIssue['severity'], string> = {
  critical: 'bg-red-600',
  high: 'bg-red-400',
  medium: 'bg-pop-500',
  low: 'bg-zinc-300',
  info: 'bg-brand-300',
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
    return <p className="p-5 text-sm text-zinc-500">No differences match the current filters.</p>;
  }
  return (
    <ul aria-label="Differences" className="divide-y divide-zinc-950/[0.05]">
      {[...groups.entries()].map(([key, members]) => {
        const first = members[0];
        if (!first) return null;
        return (
          <li key={key} className="pb-1.5">
            <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 bg-white/95 px-4 pb-1.5 pt-3.5 backdrop-blur">
              <span
                className="truncate font-display text-[14px] font-bold text-zinc-950"
                title={first.element.name}
              >
                {first.element.name}
              </span>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-500">
                {first.viewportId}
              </span>
            </div>
            <ul className="px-1.5">
              {members.map((issue) => {
                const selected = issue.id === selectedId;
                return (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(issue.id)}
                      aria-current={selected ? 'true' : undefined}
                      aria-label={`${issue.severity} severity: ${issueSummary(issue)}`}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl border-2 px-2.5 py-2 text-left text-[13px] transition-all',
                        selected
                          ? 'border-zinc-950 bg-brand-100 text-zinc-950 shadow-hard-sm'
                          : 'border-transparent text-zinc-700 hover:border-zinc-950/15 hover:bg-zinc-50',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'size-2.5 shrink-0 rounded-full border border-zinc-950/40',
                          SEVERITY_DOT[issue.severity],
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {propertyLabel(issue.property)}
                      </span>
                      <span className="hidden min-w-0 truncate font-mono text-xs text-zinc-500 sm:block">
                        {formatValue(issue.current)}
                        <span className="px-1 text-pop-500">→</span>
                        <span className="font-bold text-zinc-950">
                          {formatValue(issue.required)}
                        </span>
                      </span>
                      {issue.delta ? (
                        <span
                          className={cn(
                            'shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-bold',
                            selected
                              ? 'border-zinc-950 bg-zest-300 text-zinc-950'
                              : 'border-zinc-950/10 bg-zinc-100 text-zinc-700',
                          )}
                        >
                          {formatDelta(issue.delta)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
