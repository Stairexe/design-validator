'use client';

import type { AuditRecord } from '@design-validator/database';
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  type IssueCategory,
  type IssueSeverity,
  type ValidationIssue,
  type ValidationReport,
} from '@design-validator/design-spec';
import type { VisualSummary } from '@design-validator/pipeline';
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid';
import { CursorArrowRaysIcon } from '@heroicons/react/20/solid';
import { useMemo, useState, type ReactNode } from 'react';

import { IssueAssistance } from '@/components/issues/issue-assistance';
import { IssueDetail } from '@/components/issues/issue-detail';
import { IssueList, issueSummary } from '@/components/issues/issue-list';
import { VisualComparison } from '@/components/screenshots/visual-comparison';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { CATEGORY_COLORS, CATEGORY_LABELS, deviceKind, differenceCount } from '@/lib/labels';

import { UnresolvedTable } from './unresolved-table';
import { DEVICE_ICONS } from './viewport-chips';

type Tab = 'differences' | 'visual' | 'unresolved';

export interface AuditResultsProps {
  audit: AuditRecord;
  issues: ValidationIssue[];
  report: Pick<ValidationReport, 'groups' | 'unresolved' | 'viewports'>;
  visual: VisualSummary | null;
  aiAvailable: boolean;
  sourceAvailable: boolean;
}

function Count({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-px font-mono text-[11px] font-bold tabular-nums',
        active ? 'bg-zest-300 text-zinc-950' : 'bg-zinc-200 text-zinc-600',
      )}
    >
      {children}
    </span>
  );
}

/** Difference-first results: what to change, per viewport, never a score. */
export function AuditResults({
  audit,
  issues,
  report,
  visual,
  aiAvailable,
  sourceAvailable,
}: AuditResultsProps) {
  const [tab, setTab] = useState<Tab>('differences');
  const [category, setCategory] = useState<IssueCategory | 'all'>('all');
  const [viewport, setViewport] = useState<string>(audit.viewports[0]?.id ?? 'all');
  const [severity, setSeverity] = useState<IssueSeverity | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const viewportIssues = useMemo(
    () => issues.filter((issue) => viewport === 'all' || issue.viewportId === viewport),
    [issues, viewport],
  );
  const filtered = useMemo(
    () =>
      viewportIssues.filter(
        (issue) =>
          (category === 'all' || issue.category === category) &&
          (severity === 'all' || issue.severity === severity) &&
          (query === '' ||
            `${issue.element.name} ${issue.element.selector ?? ''} ${issue.property}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [viewportIssues, category, severity, query],
  );
  const selected = filtered.find((issue) => issue.id === selectedId) ?? filtered[0] ?? null;
  const group = selected
    ? report.groups.find((candidate) => candidate.id === selected.groupId)
    : undefined;
  const visualForViewport =
    visual?.viewports.find((entry) => entry.viewportId === (selected?.viewportId ?? viewport)) ??
    visual?.viewports[0];
  const categoryCounts = new Map<IssueCategory, number>();
  for (const issue of viewportIssues)
    categoryCounts.set(issue.category, (categoryCounts.get(issue.category) ?? 0) + 1);
  const unresolvedCount = report.unresolved.filter(
    (entry) => viewport === 'all' || entry.viewportId === viewport,
  ).length;

  const TABS: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: 'differences', label: 'Differences' },
    { id: 'visual', label: 'Visual comparison', hidden: !visual || visual.viewports.length === 0 },
    { id: 'unresolved', label: 'Unresolved mappings' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div
          role="group"
          aria-label="Viewports"
          className="inline-flex flex-wrap gap-1 rounded-2xl border-2 border-zinc-950 bg-white p-1 shadow-hard-sm"
        >
          {report.viewports.map((entry) => {
            const Icon = DEVICE_ICONS[deviceKind(entry.width)];
            const active = viewport === entry.viewportId;
            return (
              <button
                key={entry.viewportId}
                type="button"
                onClick={() => setViewport(entry.viewportId)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all',
                  active
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
                )}
              >
                <Icon aria-hidden className="size-4 opacity-70" />
                {audit.viewports.find((v) => v.id === entry.viewportId)?.label ?? entry.viewportId}
                <span className="font-mono text-xs font-normal opacity-60">{entry.width}</span>
                <Count active={active}>{entry.issueCount}</Count>
              </button>
            );
          })}
          {report.viewports.length > 1 ? (
            <button
              type="button"
              onClick={() => setViewport('all')}
              aria-pressed={viewport === 'all'}
              className={cn(
                'rounded-xl px-3 py-1.5 text-sm font-semibold transition-all',
                viewport === 'all'
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
              )}
            >
              All sizes
            </button>
          ) : null}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Result views"
        className="flex gap-6 overflow-x-auto border-b-2 border-zinc-950/10"
      >
        {TABS.filter((item) => !item.hidden).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-[2px] flex shrink-0 items-center gap-2 whitespace-nowrap border-b-[3px] pb-2.5 pt-1 font-display text-[15px] font-semibold transition-colors',
              tab === item.id
                ? 'border-pop-500 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900',
            )}
          >
            {item.id === 'differences' ? differenceCount(filtered.length) : item.label}
            {item.id === 'unresolved' ? (
              <Count active={tab === item.id}>{unresolvedCount}</Count>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'differences' ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-72">
            <MagnifyingGlassIcon
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-zinc-400"
            />
            <Input
              aria-label="Search elements"
              placeholder="Search element or selector"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Severity filter"
            value={severity}
            onChange={(event) => setSeverity(event.target.value as IssueSeverity | 'all')}
            className="lg:w-44"
          >
            <option value="all">All severities</option>
            {ISSUE_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
          <div
            className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0"
            role="group"
            aria-label="Category filter"
          >
            <FilterChip
              active={category === 'all'}
              onClick={() => setCategory('all')}
              label="All"
              count={viewportIssues.length}
            />
            {ISSUE_CATEGORIES.filter((c) => categoryCounts.has(c)).map((c) => (
              <FilterChip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
                label={CATEGORY_LABELS[c]}
                count={categoryCounts.get(c) ?? 0}
                color={CATEGORY_COLORS[c]}
              />
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'differences' ? (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Card className="overflow-hidden lg:sticky lg:top-6">
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
              <IssueList
                issues={filtered}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
              />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            {selected ? (
              <IssueDetail
                key={selected.id}
                issue={selected}
                group={group}
                onShowVisual={visual?.viewports.length ? () => setTab('visual') : undefined}
                slots={
                  <IssueAssistance
                    auditId={audit.id}
                    issue={selected}
                    aiAvailable={aiAvailable}
                    sourceAvailable={sourceAvailable}
                  />
                }
              />
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <CursorArrowRaysIcon aria-hidden className="size-6 text-zinc-300" />
                <p className="mt-3 text-sm text-zinc-500">
                  {issues.length === 0
                    ? 'No differences found: the implementation matches the design within tolerance.'
                    : 'No difference matches these filters.'}
                </p>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'visual' && visualForViewport ? (
        <Card className="space-y-4 p-4 sm:p-5">
          <p className="text-sm text-zinc-500">
            {selected ? (
              <>
                Highlighting{' '}
                <span className="font-medium text-zinc-950">{selected.element.name}</span> ·{' '}
                <span className="font-mono text-[13px]">{issueSummary(selected)}</span>.{' '}
              </>
            ) : null}
            <button
              type="button"
              className="font-semibold text-brand-600 underline decoration-2 underline-offset-4 hover:text-pop-600"
              onClick={() => setTab('differences')}
            >
              Choose another difference
            </button>
          </p>
          <VisualComparison auditId={audit.id} visual={visualForViewport} issue={selected} />
        </Card>
      ) : null}

      {tab === 'unresolved' ? (
        <Card className="overflow-hidden">
          <UnresolvedTable
            unresolved={report.unresolved.filter(
              (entry) => viewport === 'all' || entry.viewportId === viewport,
            )}
          />
        </Card>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  color = 'bg-white',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1 text-[13px] font-semibold transition-all',
        active
          ? cn(
              'border-zinc-950 text-zinc-950 shadow-hard-sm',
              color === 'bg-white' ? 'bg-zest-300' : color,
            )
          : 'border-zinc-950/15 bg-white text-zinc-600 hover:border-zinc-950 hover:text-zinc-950',
      )}
    >
      {color !== 'bg-white' ? (
        <span aria-hidden className={cn('size-2.5 rounded-full border border-zinc-950', color)} />
      ) : null}
      {label}
      <span className="font-mono text-xs tabular-nums opacity-60">{count}</span>
    </button>
  );
}
