import { DEFAULT_TOLERANCES } from '@design-validator/design-spec';
import {
  CircleStackIcon,
  CodeBracketIcon,
  CpuChipIcon,
  LockClosedIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SwatchIcon,
  TrashIcon,
} from '@heroicons/react/20/solid';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { LIMITS } from '@/lib/server/limits';
import { getRuntime } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

interface Row {
  icon: ReactNode;
  label: string;
  status: string;
  ok: boolean | 'neutral';
  description: ReactNode;
}

const STORAGE_LABELS: Record<string, string> = {
  'vercel-blob': 'Vercel Blob',
  s3: 'S3',
  filesystem: 'Local disk',
};

const TOLERANCE_LABELS: Record<string, [string, string]> = {
  positionPx: ['Position', 'px'],
  sizePx: ['Size', 'px'],
  spacingPx: ['Spacing', 'px'],
  typographyPx: ['Typography', 'px'],
  colorDelta: ['Color', ' ΔE'],
  radiusPx: ['Corner radius', 'px'],
  borderPx: ['Border', 'px'],
  opacity: ['Opacity', ''],
};

const Env = ({ children }: { children: string }) => (
  <code className="rounded-md border border-zinc-950/15 bg-zinc-100 px-1 py-px font-mono text-[11px] text-zinc-800">
    {children}
  </code>
);

function Section({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Row[];
}) {
  return (
    <Card className="animate-fade-up">
      <CardHeader title={title} description={description} />
      <ul className="divide-y divide-zinc-950/[0.05]">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-3.5 px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-950 bg-zest-300 text-zinc-950 shadow-hard-sm [&_svg]:size-4">
              {row.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-950">{row.label}</p>
                <Badge dot tone={row.ok === 'neutral' ? 'neutral' : row.ok ? 'success' : 'warning'}>
                  {row.status}
                </Badge>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">{row.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Deployment configuration status. Shows whether secrets are set, never their values. */
export default function SettingsPage() {
  const { deps, execution, storageDriver } = getRuntime();
  const persistent = storageDriver !== 'memory' || deps.repository.kind === 'postgres';
  const passwordProtected = Boolean(process.env['APP_ACCESS_PASSWORD']);

  const data: Row[] = [
    {
      icon: <CircleStackIcon />,
      label: 'Storage',
      ok: persistent,
      status: STORAGE_LABELS[storageDriver] ?? (persistent ? 'PostgreSQL' : 'Temporary'),
      description: persistent ? (
        'Projects, audits and screenshots are saved.'
      ) : (
        <>
          Data lives in server memory and can disappear. Connect a Vercel Blob store, or set{' '}
          <Env>STORAGE_DRIVER</Env>.
        </>
      ),
    },
    {
      icon: <ServerStackIcon />,
      label: 'Database',
      ok: 'neutral',
      status: deps.repository.kind === 'postgres' ? 'PostgreSQL' : 'Stored as files',
      description: (
        <>
          Optional. Set <Env>DATABASE_URL</Env> to use PostgreSQL for larger teams.
        </>
      ),
    },
    {
      icon: <TrashIcon />,
      label: 'Retention',
      ok: 'neutral',
      status: `${process.env['AUDIT_RETENTION_DAYS'] ?? '30'} days`,
      description: 'Older audits, differences and screenshots are deleted automatically every day.',
    },
  ];

  const integrations: Row[] = [
    {
      icon: <SwatchIcon />,
      label: 'Figma links',
      ok: Boolean(deps.figmaAccessToken),
      status: deps.figmaAccessToken ? 'Connected' : 'Off',
      description: deps.figmaAccessToken ? (
        'Paste Figma file links when adding a design.'
      ) : (
        <>
          Add a Figma personal access token as <Env>FIGMA_ACCESS_TOKEN</Env> to paste Figma links.
          Uploaded Figma exports work without it.
        </>
      ),
    },
    {
      icon: <SparklesIcon />,
      label: 'AI explanations',
      ok: deps.recommendationModel ? true : 'neutral',
      status: deps.recommendationModel ? 'On' : 'Off',
      description: deps.recommendationModel ? (
        `Claude (${deps.recommendationModel.model}) can explain a difference on request.`
      ) : (
        <>
          Optional. Add <Env>ANTHROPIC_API_KEY</Env> to get plain-language explanations. Measured
          differences never depend on it.
        </>
      ),
    },
    {
      icon: <CodeBracketIcon />,
      label: 'GitHub',
      ok: deps.githubToken ? true : 'neutral',
      status: deps.githubToken ? 'Token set' : 'Public access',
      description: (
        <>
          Finds the CSS line for a difference in a connected public repository.{' '}
          {deps.githubToken ? null : (
            <>
              Add <Env>GITHUB_TOKEN</Env> for higher rate limits.
            </>
          )}
        </>
      ),
    },
  ];

  const security: Row[] = [
    {
      icon: <LockClosedIcon />,
      label: 'Access',
      ok: 'neutral',
      status: passwordProtected ? 'Password protected' : 'Open',
      description: (
        <>
          <Env>APP_ACCESS_PASSWORD</Env> asks for a password on every page and API route.
        </>
      ),
    },
    {
      icon: <ShieldCheckIcon />,
      label: 'Private network addresses',
      ok: !deps.allowPrivateHosts,
      status: deps.allowPrivateHosts ? 'Allowed' : 'Blocked',
      description: deps.allowPrivateHosts
        ? 'Audits may reach internal addresses. Use this for local development only.'
        : 'Audits cannot reach internal or private addresses from this server.',
    },
    {
      icon: <CpuChipIcon />,
      label: 'Usage limits',
      ok: 'neutral',
      status: execution === 'queue' ? 'Queue workers' : 'Built in',
      description: `${LIMITS.auditsPerHour} audits per hour per visitor, ${LIMITS.concurrentAudits} at a time, ${LIMITS.auditsPerDay} per day.`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="How this workspace is set up. Changes are made in your hosting environment variables."
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section title="Data" description="Where results are kept." rows={data} />
          <Section title="Security" description="Who and what can be reached." rows={security} />
        </div>
        <div className="space-y-6">
          <Section
            title="Integrations"
            description="Optional services that add convenience."
            rows={integrations}
          />
          <Card className="animate-fade-up">
            <CardHeader
              title="Default tolerances"
              description="Differences at or below these values count as rendering noise. You can change them per audit."
            />
            <dl className="grid grid-cols-2 gap-px bg-zinc-950/[0.05] text-sm">
              {Object.entries(DEFAULT_TOLERANCES).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 bg-white px-5 py-3"
                >
                  <dt className="text-zinc-600">{TOLERANCE_LABELS[key]?.[0] ?? key}</dt>
                  <dd className="font-mono text-zinc-950">
                    {value}
                    {TOLERANCE_LABELS[key]?.[1] ?? ''}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
