import type { ReactNode } from 'react';

export function EmptyState({
  title,
  children,
  icon,
  action,
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="flex flex-col items-center px-6 py-12 text-center">
      {icon ? (
        <span className="mb-5 flex size-14 -rotate-6 items-center justify-center rounded-2xl border-2 border-zinc-950 bg-zest-300 text-zinc-950 shadow-hard [&_svg]:size-6">
          {icon}
        </span>
      ) : null}
      <h2 className="font-display text-xl font-bold tracking-tight text-zinc-950">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">{children}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
