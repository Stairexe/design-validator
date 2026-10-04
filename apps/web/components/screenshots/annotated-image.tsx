'use client';

import type { Bounds } from '@design-validator/design-spec';
import { useEffect, useRef, useState } from 'react';

/** A screenshot with a highlighted region; scrolls the region into view when it changes. */
export function AnnotatedImage({
  src,
  alt,
  highlight,
  className,
}: {
  src: string;
  alt: string;
  highlight: Bounds | null;
  className?: string;
}) {
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlight, natural]);

  return (
    <div className={className ?? 'relative overflow-hidden'}>
      {/* Private API-served PNG of arbitrary size; next/image optimization is not useful here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="block w-full select-none"
        onLoad={(event) =>
          setNatural({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })
        }
      />
      {highlight && natural ? (
        <div
          ref={boxRef}
          aria-hidden
          className="pointer-events-none absolute rounded-sm outline outline-2 outline-offset-2 outline-pop-500"
          style={{
            left: `${(highlight.x / natural.width) * 100}%`,
            top: `${(highlight.y / natural.height) * 100}%`,
            width: `${(highlight.width / natural.width) * 100}%`,
            height: `${(highlight.height / natural.height) * 100}%`,
            boxShadow: '0 0 0 9999px rgb(24 24 27 / 0.18)',
          }}
        />
      ) : null}
    </div>
  );
}
