import Link from 'next/link';

import { cn } from '@/lib/cn';
import { getRuntime } from '@/lib/server/runtime';

function Row({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
        <span
          aria-hidden
          className={cn('size-1.5 rounded-full', ok ? 'bg-zest-300' : 'bg-pop-500')}
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
      className="block space-y-2 rounded-xl border-2 border-zinc-800 p-3 text-xs transition-colors hover:border-zinc-600 hover:bg-white/[0.03]"
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
