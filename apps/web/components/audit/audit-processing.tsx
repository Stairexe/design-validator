'use client';

import type { AuditRecord, AuditStatus, StageRunRecord } from '@design-validator/database';
import { CheckIcon } from '@heroicons/react/16/solid';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, Spinner } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  const percent = Math.round((audit.progress?.progress ?? 0) * 100);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] animate-fade-up items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-5 pt-6">
          <div className="flex items-start gap-4">
            <span className="relative flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Spinner className="size-5" />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-zinc-950">
                Checking the page against the design
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500" aria-live="polite">
                {audit.progress?.message ?? 'Waiting to start'}
              </p>
            </div>
          </div>
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
        </div>
        <div className="px-6">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-zinc-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Audit progress"
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(percent, 4)}%` }}
            />
          </div>
        </div>
        <div className="grid gap-6 px-6 py-6 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-medium text-zinc-500">{group.title}</h3>
              <ul className="mt-2.5 space-y-2.5">
                {group.steps
                  .filter((step) => step.stage !== 'VISUAL_DIFF' || audit.settings.visualDiff)
                  .map((step) => {
                    const status = stepState(step.stage, audit.status, stageRuns);
                    return (
                      <li
                        key={step.label}
                        className={cn(
                          'flex items-center gap-2.5 text-sm',
                          status === 'pending' ? 'text-zinc-400' : 'text-zinc-800',
                          status === 'active' && 'font-medium text-zinc-950',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full',
                            status === 'done' && 'bg-emerald-500 text-white',
                            status === 'active' && 'bg-brand-50 text-brand-600',
                            status === 'pending' && 'ring-1 ring-inset ring-zinc-200',
                          )}
                        >
                          {status === 'done' ? <CheckIcon className="size-3" /> : null}
                          {status === 'active' ? <Spinner className="size-3" /> : null}
                        </span>
                        {step.label}
                        <span className="sr-only">({status})</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5 text-sm text-zinc-600">
        <h2 className="font-semibold text-zinc-950">While you wait</h2>
        <ul className="mt-3 space-y-2.5 leading-relaxed">
          <li>The page is opened in a real browser at each screen size.</li>
          <li>Every element is matched to its layer in the design.</li>
          <li>Each property is compared with exact values and tolerances.</li>
        </ul>
        <p className="mt-4 text-xs text-zinc-400">
          This usually takes under a minute. You can leave this page; it keeps running.
        </p>
      </Card>
    </div>
  );
}
