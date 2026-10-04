import { cn } from '@/lib/cn';

const TINTS = [
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-lime-100 text-lime-800',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
];

function hash(value: string): number {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

/** Initial on a stable tint so projects are recognisable at a glance. */
export function ProjectAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial =
    name
      .replace(/^sample:\s*/i, '')
      .trim()
      .charAt(0)
      .toUpperCase() || '?';
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg font-semibold ring-1 ring-inset ring-zinc-950/5',
        TINTS[hash(name) % TINTS.length],
        size === 'sm' && 'size-7 text-xs',
        size === 'md' && 'size-9 text-sm',
        size === 'lg' && 'size-12 rounded-xl text-lg',
      )}
    >
      {initial}
    </span>
  );
}
