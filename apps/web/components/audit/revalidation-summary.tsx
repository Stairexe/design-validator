import { formatValue, propertyLabel, type ValidationIssue } from '@design-validator/design-spec';
import type { RevalidationDiff } from '@design-validator/pipeline';
import Link from 'next/link';

import { Card, CardBody, CardHeader } from '@/components/ui/card';

const line = (issue: ValidationIssue) =>
  `${issue.element.name} · ${propertyLabel(issue.property)} (${issue.viewportId})`;

/** What changed since the audit this one re-validates (Phase 11). */
export function RevalidationSummary({
  parentId,
  diff,
}: {
  parentId: string;
  diff: RevalidationDiff;
}) {
  const changed = diff.persisting.filter((entry) => entry.changed);
  return (
    <Card className="mb-6">
      <CardHeader
        title="Since the previous audit"
        description={
          <>
            Compared with{' '}
            <Link href={`/audits/${parentId}`} className="underline underline-offset-2">
              the audit this re-validates
            </Link>
            .
          </>
        }
      />
      <CardBody className="grid gap-4 text-sm md:grid-cols-3">
        <div>
          <h3 className="font-semibold text-emerald-700">Resolved ({diff.resolved.length})</h3>
          <ul className="mt-1 space-y-0.5">
            {diff.resolved.slice(0, 12).map((issue) => (
              <li key={issue.id}>✓ {line(issue)}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Still different ({diff.persisting.length})</h3>
          <ul className="mt-1 space-y-0.5">
            {changed.slice(0, 12).map(({ before, after }) => (
              <li key={after.id}>
                {line(after)}:{' '}
                <span className="font-mono text-xs">
                  {formatValue(before.current)} → {formatValue(after.current)}
                </span>{' '}
                (required {formatValue(after.required)})
              </li>
            ))}
            {diff.persisting.length > changed.length ? (
              <li className="text-zinc-500">{diff.persisting.length - changed.length} unchanged</li>
            ) : null}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-red-700">New ({diff.introduced.length})</h3>
          <ul className="mt-1 space-y-0.5">
            {diff.introduced.slice(0, 12).map((issue) => (
              <li key={issue.id}>{line(issue)}</li>
            ))}
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}
