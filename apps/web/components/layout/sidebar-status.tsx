import Link from 'next/link';

import { cn } from '@/lib/cn';
import { getRuntime } from '@/lib/server/runtime';

function Row({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-zinc-700">
        <span
          aria-hidden
          className={cn('size-1.5 rounded-full', ok ? 'bg-emerald-500' : 'bg-amber-500')}
        />
        {value}
      </span>
    </div>
  );
}

/** Compact deployment status in the sidebar; details live on the Settings page. */
export function SidebarStatus() {
  const { deps, storageDriver } = getRuntime();
  const persistent = storageDriver !== 'memory' || deps.repository.kind === 'postgres';
  return (
    <Link
      href="/settings"
      className="block space-y-1.5 rounded-xl bg-white/70 p-3 text-xs shadow-card ring-1 ring-zinc-950/[0.06] transition-colors hover:bg-white"
    >
      <Row ok={persistent} label="Storage" value={persistent ? 'Saved' : 'Temporary'} />
      <Row
        ok={Boolean(deps.figmaAccessToken)}
        label="Figma links"
        value={deps.figmaAccessToken ? 'On' : 'Off'}
      />
    </Link>
  );
}
