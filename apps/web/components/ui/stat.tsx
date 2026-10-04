import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Card } from './card';

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'brand' | 'warning' | 'success';
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-zinc-500">{label}</p>
        {icon ? (
          <span
            className={cn(
              'flex size-7 items-center justify-center rounded-lg [&_svg]:size-4',
              tone === 'brand' && 'bg-brand-50 text-brand-600',
              tone === 'warning' && 'bg-amber-50 text-amber-600',
              tone === 'success' && 'bg-emerald-50 text-emerald-600',
              tone === 'neutral' && 'bg-zinc-100 text-zinc-500',
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-zinc-950 tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}
