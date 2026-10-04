import { ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';

import { getRuntime } from '@/lib/server/runtime';

/** Warns when data lives only in server memory (no database or persistent storage configured). */
export function StorageWarning() {
  const { storageDriver, deps } = getRuntime();
  if (storageDriver !== 'memory' || deps.repository.kind === 'postgres') return null;
  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20"
    >
      <ExclamationTriangleIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-500" />
      <p>
        <span className="font-medium">Temporary storage.</span> Projects and audits are kept in
        server memory and may disappear. Connect a Vercel Blob store (or set DATABASE_URL and a
        storage driver) to keep them.{' '}
        <Link href="/settings" className="font-medium underline underline-offset-2">
          Settings
        </Link>
      </p>
    </div>
  );
}
