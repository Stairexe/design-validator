import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/cn';

const TONES = {
  neutral: 'bg-sky-200',
  brand: 'bg-brand-200',
  warning: 'bg-pop-200',
  success: 'bg-zest-300',
} as const;

/** A count on a coloured tile. Counts orient; they never rate the page. */
export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  tilt = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
  tilt?: number;
}) {
  return (
    <section
      className={cn(
        'rotate-(--tilt) rounded-2xl border-2 border-zinc-950 p-5 shadow-hard transition-[rotate,translate,box-shadow] duration-200 hover:-translate-y-1 hover:rotate-0 hover:shadow-hard-lg',
        TONES[tone],
      )}
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-zinc-950/70">{label}</p>
        {icon ? (
          <span className="flex size-8 items-center justify-center rounded-full border-2 border-zinc-950 bg-white text-zinc-950 [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-[44px] font-bold leading-none tracking-tight text-zinc-950 tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs font-medium text-zinc-950/60">{hint}</p> : null}
    </section>
  );
}
