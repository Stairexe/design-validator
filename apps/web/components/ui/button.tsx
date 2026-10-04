import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

/** Chunky buttons: ink outline and a hard offset shadow that lifts on hover and presses on click. */
const RAISED =
  'border-2 border-zinc-950 hover:-translate-x-px hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';

const VARIANTS: Record<Variant, string> = {
  primary: cn(
    RAISED,
    'bg-pop-500 text-zinc-950 shadow-hard hover:bg-pop-300 hover:shadow-hard-lg disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none',
  ),
  brand: cn(
    RAISED,
    'bg-brand-600 text-white shadow-hard hover:bg-brand-500 hover:shadow-hard-lg disabled:bg-brand-200 disabled:shadow-none',
  ),
  secondary: cn(
    RAISED,
    'bg-white text-zinc-950 shadow-hard-sm hover:bg-zest-100 hover:shadow-hard disabled:text-zinc-400 disabled:shadow-none',
  ),
  ghost:
    'border-2 border-transparent text-zinc-600 hover:bg-zinc-950/[0.06] hover:text-zinc-950 disabled:text-zinc-400',
  danger:
    'border-2 border-red-700 bg-white text-red-700 shadow-[2px_2px_0_0_var(--color-red-700)] hover:-translate-x-px hover:-translate-y-px hover:bg-red-50 hover:shadow-[3px_3px_0_0_var(--color-red-700)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-6 text-[15px]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-[transform,box-shadow,background-color,color] duration-150 ease-out disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/** Inline spinner for pending buttons. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn('size-4 animate-spin', className)}
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
