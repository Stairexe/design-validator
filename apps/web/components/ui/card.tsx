import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  // Callers may restyle the surface; defaults apply only where they don't.
  const ownBackground = /(^|\s)bg-/.test(className);
  const ownBorder = /(^|\s)border-\d/.test(className);
  return (
    <section
      className={cn(
        'rounded-2xl',
        !ownBorder && 'border border-zinc-950/10',
        !ownBackground && 'bg-white',
        !/(^|\s)shadow-/.test(className) && 'shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-950/[0.07] px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-950 bg-zest-300 text-zinc-950 shadow-hard-sm [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-display text-[17px] font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-sm text-zinc-500">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

/** Loading placeholder that matches the shape of what it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-shimmer rounded-lg bg-zinc-200', className)} />;
}
