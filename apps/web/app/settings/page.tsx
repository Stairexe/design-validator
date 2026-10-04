import { DEFAULT_TOLERANCES } from '@design-validator/design-spec';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { getRuntime } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

function Status({ ok, children }: { ok: boolean; children: string }) {
  return <Badge tone={ok ? 'success' : 'neutral'}>{children}</Badge>;
}

/** Deployment configuration status. Shows whether secrets are set, never their values. */
export default function SettingsPage() {
  const { deps, execution } = getRuntime();
  const rows: [string, React.ReactNode, string][] = [
    [
      'Persistence',
      <Status key="db" ok>
        {deps.repository.kind === 'postgres' ? 'PostgreSQL' : 'Object-storage documents'}
      </Status>,
      'Set DATABASE_URL to use PostgreSQL.',
    ],
    [
      'Audit execution',
      <Status key="exec" ok>
        {execution === 'queue' ? 'Queue workers (BullMQ)' : 'Inline (in the web process)'}
      </Status>,
      'AUDIT_EXECUTION=queue with REDIS_URL runs stages on workers.',
    ],
    [
      'Figma API',
      <Status key="figma" ok={Boolean(deps.figmaAccessToken)}>
        {deps.figmaAccessToken ? 'Token configured' : 'Not configured'}
      </Status>,
      'FIGMA_ACCESS_TOKEN enables Figma URLs and frame image exports. Uploaded exports work without it.',
    ],
    [
      'Claude recommendations',
      <Status key="ai" ok={Boolean(process.env['ANTHROPIC_API_KEY'])}>
        {process.env['ANTHROPIC_API_KEY'] ? 'Enabled' : 'Disabled'}
      </Status>,
      'ANTHROPIC_API_KEY enables optional explanations. Measured differences never depend on it.',
    ],
    [
      'Private network targets',
      <Status key="ssrf" ok={!deps.allowPrivateHosts}>
        {deps.allowPrivateHosts ? 'Allowed (development)' : 'Blocked'}
      </Status>,
      'INSPECTOR_ALLOW_PRIVATE_HOSTS must stay false in production.',
    ],
  ];
  return (
    <>
      <PageHeader
        title="Settings"
        description="Deployment configuration and comparison defaults."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Configuration"
            description="Configured through environment variables (see .env.example)."
          />
          <CardBody>
            <dl className="divide-y divide-zinc-100 text-sm">
              {rows.map(([label, value, hint]) => (
                <div key={label} className="py-2">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Default tolerances"
            description="Differences at or below these values are treated as rendering noise. Adjust per audit."
          />
          <CardBody>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(DEFAULT_TOLERANCES).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between gap-2 rounded bg-zinc-50 px-3 py-1.5"
                >
                  <dt>{key}</dt>
                  <dd className="font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
