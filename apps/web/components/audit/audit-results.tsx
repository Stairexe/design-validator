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
import { useMemo, useState } from 'react';

import { IssueAssistance } from '@/components/issues/issue-assistance';
import { IssueDetail } from '@/components/issues/issue-detail';
import { IssueList, issueSummary } from '@/components/issues/issue-list';
import { VisualComparison } from '@/components/screenshots/visual-comparison';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { CATEGORY_LABELS, differenceCount } from '@/lib/labels';

import { UnresolvedTable } from './unresolved-table';

type Tab = 'differences' | 'visual' | 'unresolved';

export interface AuditResultsProps {
  audit: AuditRecord;
  issues: ValidationIssue[];
  report: Pick<ValidationReport, 'groups' | 'unresolved' | 'viewports'>;
  visual: VisualSummary | null;
  aiAvailable: boolean;
  sourceAvailable: boolean;
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

  const TABS: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: 'differences', label: differenceCount(filtered.length) },
    { id: 'visual', label: 'Visual comparison', hidden: !visual || visual.viewports.length === 0 },
    { id: 'unresolved', label: `Unresolved mappings (${report.unresolved.length})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Viewports">
        {report.viewports.map((entry) => (
          <button
            key={entry.viewportId}
            type="button"
            onClick={() => setViewport(entry.viewportId)}
            aria-pressed={viewport === entry.viewportId}
            className={cn(
              'rounded-md border px-3 py-2 text-left text-sm',
              viewport === entry.viewportId
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white hover:bg-zinc-50',
            )}
          >
            <span className="font-medium">
              {audit.viewports.find((v) => v.id === entry.viewportId)?.label ?? entry.viewportId}{' '}
              {entry.width}×{entry.height}
            </span>
            <span className="block text-xs opacity-80">{differenceCount(entry.issueCount)}</span>
          </button>
        ))}
        {report.viewports.length > 1 ? (
          <button
            type="button"
            onClick={() => setViewport('all')}
            aria-pressed={viewport === 'all'}
            className={cn(
              'rounded-md border px-3 py-2 text-sm',
              viewport === 'all'
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white hover:bg-zinc-50',
            )}
          >
            All viewports
          </button>
        ) : null}
      </div>

      <div role="tablist" aria-label="Result views" className="flex gap-1 border-b border-zinc-200">
        {TABS.filter((item) => !item.hidden).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              tab === item.id
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'differences' ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Category filter">
            <FilterChip
              active={category === 'all'}
              onClick={() => setCategory('all')}
              label={`All (${viewportIssues.length})`}
            />
            {ISSUE_CATEGORIES.filter((c) => categoryCounts.has(c)).map((c) => (
              <FilterChip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
                label={`${CATEGORY_LABELS[c]} (${categoryCounts.get(c) ?? 0})`}
              />
            ))}
          </div>
          <div className="w-40">
            <Select
              aria-label="Severity filter"
              value={severity}
              onChange={(event) => setSeverity(event.target.value as IssueSeverity | 'all')}
            >
              <option value="all">All severities</option>
              {ISSUE_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-64">
            <Input
              aria-label="Search elements"
              placeholder="Search element or selector"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      {tab === 'differences' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card className="max-h-[75vh] overflow-y-auto">
            <IssueList
              issues={filtered}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
            />
          </Card>
          <Card className="p-5">
            {selected ? (
              <IssueDetail
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
              <p className="text-sm text-zinc-600">
                {issues.length === 0
                  ? 'No differences found: the implementation matches the design within tolerance.'
                  : 'Select a difference.'}
              </p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'visual' && visualForViewport ? (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-zinc-600">
            {selected ? (
              <>
                Highlighting{' '}
                <span className="font-medium text-zinc-900">{selected.element.name}</span> —{' '}
                {issueSummary(selected)}.{' '}
              </>
            ) : null}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => setTab('differences')}
            >
              Choose another difference
            </button>
          </p>
          <VisualComparison auditId={audit.id} visual={visualForViewport} issue={selected} />
        </Card>
      ) : null}

      {tab === 'unresolved' ? (
        <Card>
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
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium',
        active
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50',
      )}
    >
      {label}
    </button>
  );
}
