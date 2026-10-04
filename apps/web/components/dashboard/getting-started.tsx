import { ArrowRightIcon } from '@heroicons/react/16/solid';

import { RunSampleButton } from '@/components/audit/run-sample-button';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const STEPS = [
  {
    title: 'Create a project',
    body: 'Add the address of the page you want to check.',
  },
  {
    title: 'Add the design',
    body: 'Paste a Figma link, or upload a Figma or Adobe XD export.',
  },
  {
    title: 'Run an audit',
    body: 'Get every difference with the current value, the required value and the change.',
  },
];

const PREVIEW_ROWS = [
  { property: 'Padding X', current: '20px', required: '24px', change: '+4px' },
  { property: 'Radius', current: '8px', required: '12px', change: '+4px' },
  { property: 'Font weight', current: '500', required: '600', change: '+100' },
];

/** A static example of the report's wording, so first-time users know what they will get. */
export function SampleIssuePreview({ compact = false }: { compact?: boolean }) {
  const rows = compact ? PREVIEW_ROWS.slice(0, 2) : PREVIEW_ROWS;
  return (
    <figure
      aria-label="Example difference from a report"
      className="overflow-hidden rounded-xl bg-white text-sm shadow-raised ring-1 ring-zinc-950/[0.08]"
    >
      <figcaption className="flex items-center justify-between gap-2 border-b border-zinc-950/[0.06] px-4 py-2.5">
        <span className="font-medium text-zinc-950">Button / Primary CTA</span>
        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500">
          desktop
        </span>
      </figcaption>
      <div className="divide-y divide-zinc-950/[0.05]">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-1.5 text-[11px] font-medium text-zinc-400">
          <span>Property</span>
          <span>Current</span>
          <span>Required</span>
          <span>Change</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.property}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-4 py-2"
          >
            <span className="text-zinc-700">{row.property}</span>
            <span className="font-mono text-[13px] text-zinc-500 line-through decoration-zinc-300">
              {row.current}
            </span>
            <span className="font-mono text-[13px] font-medium text-zinc-950">{row.required}</span>
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-center font-mono text-[12px] font-medium text-brand-700">
              {row.change}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function GettingStarted({ hasProjects }: { hasProjects: boolean }) {
  return (
    <Card className="grid grid-cols-[minmax(0,1fr)] animate-fade-up overflow-hidden lg:grid-cols-[1.1fr_1fr]">
      <div className="p-6 sm:p-10">
        <p className="text-[13px] font-medium text-brand-600">Get started</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-zinc-950 sm:text-3xl">
          Find every place your website drifts from its design
        </h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-zinc-500">
          Design Validator measures the live page in a real browser, compares it with your Figma or
          Adobe XD file and lists exactly what to change. No guesswork and no vague ratings.
        </p>

        <ol className="mt-8 space-y-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums',
                  index === 0 && !hasProjects
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-500 ring-1 ring-zinc-950/10',
                )}
              >
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-950">{step.title}</p>
                <p className="mt-0.5 text-sm text-zinc-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-9 flex flex-wrap items-start gap-3">
          <RunSampleButton variant="brand" size="lg" />
          <ButtonLink
            href={hasProjects ? '/audits/new' : '/projects'}
            variant="secondary"
            size="lg"
          >
            {hasProjects ? 'Start an audit' : 'Create a project'}
            <ArrowRightIcon aria-hidden className="text-zinc-400" />
          </ButtonLink>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          The sample needs no account or design file and takes about a minute.
        </p>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden border-t border-zinc-950/[0.06] bg-zinc-50 p-6 sm:p-10 lg:border-l lg:border-t-0">
        <div
          aria-hidden
          className="absolute inset-0 [background-image:linear-gradient(to_right,rgb(24_24_27/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(24_24_27/0.05)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
        />
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-200/40 blur-3xl"
        />
        <div className="relative w-full max-w-sm space-y-3">
          <SampleIssuePreview />
          <p className="text-center text-xs text-zinc-400">
            Every difference names an element, a property and exact values.
          </p>
        </div>
      </div>
    </Card>
  );
}
