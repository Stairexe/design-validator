'use client';

import type { AuditRecord, AuditStatus, StageRunRecord } from '@design-validator/database';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { apiRequest } from '@/lib/api-client';
import { cn } from '@/lib/cn';

const ORDER: AuditStatus[] = [
  'QUEUED',
  'INSPECTING_WEBSITE',
  'IMPORTING_DESIGN',
  'NORMALIZING',
  'MATCHING',
  'COMPARING',
  'VISUAL_DIFF',
  'COMPLETED',
];

const GROUPS: { title: string; steps: { label: string; stage: AuditStatus }[] }[] = [
  {
    title: 'Website',
    steps: [
      { label: 'Loading and rendering', stage: 'INSPECTING_WEBSITE' },
      { label: 'Extracting styles and geometry', stage: 'INSPECTING_WEBSITE' },
      { label: 'Capturing screenshots', stage: 'INSPECTING_WEBSITE' },
    ],
  },
  {
    title: 'Design',
    steps: [
      { label: 'Loading and parsing hierarchy', stage: 'IMPORTING_DESIGN' },
      { label: 'Normalizing', stage: 'NORMALIZING' },
    ],
  },
  {
    title: 'Comparison',
    steps: [
      { label: 'Matching elements', stage: 'MATCHING' },
      { label: 'Comparing properties', stage: 'COMPARING' },
      { label: 'Building visual comparison', stage: 'VISUAL_DIFF' },
    ],
  },
];

const TERMINAL = new Set<AuditStatus>(['COMPLETED', 'FAILED', 'CANCELLED']);

function stepState(
  stage: AuditStatus,
  current: AuditStatus,
  runs: StageRunRecord[],
): 'done' | 'active' | 'pending' {
  if (runs.some((run) => run.stage === stage && run.status === 'RUNNING')) return 'active';
  if (stage === current) return 'active';
  const done = runs.some((run) => run.stage === stage && run.status === 'SUCCEEDED');
  return done || ORDER.indexOf(stage) < ORDER.indexOf(current) ? 'done' : 'pending';
}

/** Live pipeline progress; polls the audit until it reaches a terminal state. */
export function AuditProcessing({
  initial,
}: {
  initial: { audit: AuditRecord; stageRuns: StageRunRecord[] };
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const { audit, stageRuns } = state;

  useEffect(() => {
    if (TERMINAL.has(audit.status)) {
      router.refresh();
      return;
    }
    const timer = setTimeout(() => {
      void apiRequest<typeof initial>(`/api/audits/${audit.id}`).then(setState, () => undefined);
    }, 1500);
    return () => clearTimeout(timer);
  }, [audit, router, initial]);

  return (
    <Card className="max-w-2xl">
      <CardHeader
        title="Running validation"
        description={<span aria-live="polite">{audit.progress?.message ?? 'Queued'}</span>}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              void apiRequest(`/api/audits/${audit.id}/cancel`, { body: {} }).then(() =>
                router.refresh(),
              )
            }
          >
            Cancel
          </Button>
        }
      />
      <CardBody className="space-y-5">
        <div
          className="h-2 overflow-hidden rounded bg-zinc-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((audit.progress?.progress ?? 0) * 100)}
          aria-label="Audit progress"
        >
          <div
            className="h-full bg-zinc-900 transition-all"
            style={{ width: `${Math.round((audit.progress?.progress ?? 0) * 100)}%` }}
          />
        </div>
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <ul className="mt-1 space-y-1">
              {group.steps
                .filter((step) => step.stage !== 'VISUAL_DIFF' || audit.settings.visualDiff)
                .map((step) => {
                  const status = stepState(step.stage, audit.status, stageRuns);
                  return (
                    <li
                      key={step.label}
                      className={cn(
                        'flex items-center gap-2 text-sm',
                        status === 'pending' ? 'text-zinc-400' : 'text-zinc-800',
                      )}
                    >
                      <span aria-hidden className="w-4 text-center">
                        {status === 'done' ? '✓' : status === 'active' ? '●' : '○'}
                      </span>
                      {step.label}
                      <span className="sr-only">({status})</span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
        <p className="text-xs text-zinc-500">
          Remaining time is not estimated; pages and designs vary widely.
        </p>
      </CardBody>
    </Card>
  );
}
