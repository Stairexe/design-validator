import { getRuntime } from '@/lib/server/runtime';

/** Warns when data lives only in server memory (no database or persistent storage configured). */
export function StorageWarning() {
  const { storageDriver, deps } = getRuntime();
  if (storageDriver !== 'memory' || deps.repository.kind === 'postgres') return null;
  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-center text-sm text-amber-900"
    >
      Temporary storage: projects and audits are kept in server memory and may disappear. Connect a
      Vercel Blob store (or set DATABASE_URL and a storage driver) to keep them.
    </div>
  );
}
