import { ArrowRightIcon } from '@heroicons/react/16/solid';
import type { CSSProperties } from 'react';

import { RunSampleButton } from '@/components/audit/run-sample-button';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const STEPS = [
  {
    title: 'Create a project',
    body: 'Add the address of the page you want to check.',
    tone: 'bg-sky-200',
  },
  {
    title: 'Add the design',
    body: 'Paste a Figma link, or upload a Figma or Adobe XD export.',
    tone: 'bg-pop-200',
  },
  {
    title: 'Run an audit',
    body: 'Get every difference with the current value, the required value and the change.',
    tone: 'bg-zest-300',
  },
];

const PREVIEW_ROWS = [
  { property: 'Padding X', current: '20px', required: '24px', change: '+4px' },
  { property: 'Radius', current: '8px', required: '12px', change: '+4px' },
  { property: 'Font size', current: '44px', required: '48px', change: '+4px' },
];

/** A static example of the report's wording, so first-time users know what they will get. */
export function SampleIssuePreview({ compact = false }: { compact?: boolean }) {
  const rows = compact ? PREVIEW_ROWS.slice(0, 2) : PREVIEW_ROWS;
  return (
    <figure
      aria-label="Example difference from a report"
      className="overflow-hidden rounded-2xl border-2 border-zinc-950 bg-white text-sm shadow-hard-lg"
    >
      <figcaption className="flex items-center justify-between gap-2 border-b-2 border-zinc-950 bg-zinc-950 px-4 py-2.5 text-white">
        <span className="font-display font-semibold">Button / Primary CTA</span>
        <span className="rounded-full bg-zest-300 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-950">
          desktop
        </span>
      </figcaption>
      <div className="divide-y divide-zinc-950/10">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          <span>Property</span>
          <span>Now</span>
          <span>Needs</span>
          <span>Fix</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.property}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-4 py-2.5"
          >
            <span className="font-medium text-zinc-800">{row.property}</span>
            <span className="font-mono text-[13px] text-zinc-400 line-through decoration-pop-500 decoration-2">
              {row.current}
            </span>
            <span className="font-mono text-[13px] font-bold text-zinc-950">{row.required}</span>
            <span className="rounded-md border-2 border-zinc-950 bg-zest-300 px-1.5 py-0.5 text-center font-mono text-[12px] font-bold text-zinc-950">
              {row.change}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

function Sticker({
  children,
  className,
  tilt,
}: {
  children: string;
  className: string;
  tilt: number;
}) {
  return (
    <span
      aria-hidden
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
      className={cn(
        'absolute animate-float rounded-full border-2 border-zinc-950 px-3 py-1 font-display text-sm font-bold text-zinc-950 shadow-hard-sm',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function GettingStarted({ hasProjects }: { hasProjects: boolean }) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] animate-fade-up overflow-hidden rounded-3xl border-2 border-zinc-950 bg-white shadow-hard-xl lg:grid-cols-[1.1fr_1fr]">
      <div className="p-6 sm:p-10">
        <p className="inline-flex -rotate-2 items-center gap-2 rounded-full border-2 border-zinc-950 bg-pop-500 px-3 py-1 text-[13px] font-bold text-zinc-950">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-zinc-950" />
          Get started
        </p>
        <h2 className="mt-5 font-display text-[34px] font-bold leading-[1.02] tracking-[-0.035em] text-zinc-950 sm:text-[48px]">
          Find every pixel your website{' '}
          <span className="relative inline-block whitespace-nowrap">
            <span
              aria-hidden
              className="absolute inset-x-[-4px] bottom-[6%] top-[38%] -z-0 -rotate-1 rounded-md bg-zest-300"
            />
            <span className="relative">drifts</span>
          </span>{' '}
          from its design
        </h2>
        <p className="mt-4 max-w-md text-[16px] leading-relaxed text-zinc-600">
          We open the live page in a real browser, compare it with your Figma or Adobe XD file and
          tell you exactly what to change. No guesswork, no vague ratings.
        </p>

        <ol className="mt-8 space-y-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex items-start gap-4 rounded-2xl border-2 border-zinc-950/10 p-3 transition-colors hover:border-zinc-950"
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-950 font-display text-base font-bold text-zinc-950 tabular-nums',
                  step.tone,
                  index === 0 && !hasProjects && 'shadow-hard-sm',
                )}
              >
                {index + 1}
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold text-zinc-950">{step.title}</p>
                <p className="mt-0.5 text-sm text-zinc-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap items-start gap-3">
          <RunSampleButton variant="primary" size="lg" />
          <ButtonLink
            href={hasProjects ? '/audits/new' : '/projects'}
            variant="secondary"
            size="lg"
          >
            {hasProjects ? 'Start an audit' : 'Create a project'}
            <ArrowRightIcon aria-hidden />
          </ButtonLink>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          The sample needs no account or design file and takes about a minute.
        </p>
      </div>

      <div className="relative flex min-h-[26rem] items-center justify-center overflow-hidden border-t-2 border-zinc-950 bg-brand-600 p-8 sm:p-12 lg:border-l-2 lg:border-t-0">
        <div
          aria-hidden
          className="absolute inset-0 [background-image:linear-gradient(to_right,rgb(255_255_255/0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.12)_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div
          aria-hidden
          className="absolute -right-16 -top-16 size-64 rounded-full border-2 border-zinc-950 bg-pop-500"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -left-12 size-56 rounded-full border-2 border-zinc-950 bg-zest-300"
        />
        <Sticker className="right-8 top-10 bg-zest-300" tilt={8}>
          +4px
        </Sticker>
        <Sticker className="bottom-12 right-10 bg-white" tilt={-6}>
          exact values
        </Sticker>
        <Sticker className="left-8 top-16 bg-sky-200" tilt={-10}>
          Figma ↔ live
        </Sticker>
        <div className="relative w-full max-w-sm -rotate-2 transition-transform duration-500 hover:rotate-0">
          <SampleIssuePreview />
        </div>
      </div>
    </section>
  );
}
