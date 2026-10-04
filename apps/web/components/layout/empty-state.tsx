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
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-white text-zinc-400 shadow-card ring-1 ring-zinc-950/[0.07] [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <h2 className="text-[15px] font-semibold text-zinc-950">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">{children}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
