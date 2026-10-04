import { cn } from '@/lib/cn';

const TINTS = [
  'bg-sky-200',
  'bg-pop-200',
  'bg-zest-300',
  'bg-pink-200',
  'bg-brand-200',
  'bg-amber-200',
  'bg-teal-200',
  'bg-fuchsia-200',
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
        'flex shrink-0 -rotate-3 items-center justify-center rounded-xl border-2 border-zinc-950 font-display font-bold text-zinc-950 shadow-hard-sm',
        TINTS[hash(name) % TINTS.length],
        size === 'sm' && 'size-7 text-xs',
        size === 'md' && 'size-10 text-base',
        size === 'lg' && 'size-14 rounded-2xl text-2xl',
      )}
    >
      {initial}
    </span>
  );
}
