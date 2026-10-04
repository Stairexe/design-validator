import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

const TONES = {
  neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-500/15',
  info: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15',
} as const;

const DOTS = {
  neutral: 'bg-zinc-400',
  info: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  tone = 'neutral',
  dot = false,
  pulse = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span aria-hidden className="relative flex size-1.5">
          {pulse ? (
            <span
              className={cn('absolute inset-0 animate-ping rounded-full opacity-60', DOTS[tone])}
            />
          ) : null}
          <span className={cn('relative size-1.5 rounded-full', DOTS[tone])} />
        </span>
      ) : null}
      {children}
    </span>
  );
}
