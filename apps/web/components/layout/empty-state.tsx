import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-prose text-sm text-zinc-600">{children}</p>
    </section>
  );
}
