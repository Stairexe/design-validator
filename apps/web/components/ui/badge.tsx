import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

const TONES = {
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-950/10',
  info: 'bg-brand-100 text-brand-700 border-brand-600/20',
  success: 'bg-zest-200 text-zinc-950 border-zinc-950/15',
  warning: 'bg-pop-100 text-pop-700 border-pop-600/25',
  danger: 'bg-red-100 text-red-700 border-red-600/20',
} as const;

const DOTS = {
  neutral: 'bg-zinc-400',
  info: 'bg-brand-500',
  success: 'bg-emerald-600',
  warning: 'bg-pop-500',
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
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span aria-hidden className="relative flex size-1.5">
          {pulse ? (
            <span
              className={cn('absolute inset-0 animate-ping rounded-full opacity-70', DOTS[tone])}
            />
          ) : null}
          <span className={cn('relative size-1.5 rounded-full', DOTS[tone])} />
        </span>
      ) : null}
      {children}
    </span>
  );
}
