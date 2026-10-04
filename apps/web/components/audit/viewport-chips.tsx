import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
} from '@heroicons/react/16/solid';

import { deviceKind, type DeviceKind } from '@/lib/labels';

export const DEVICE_ICONS: Record<DeviceKind, typeof ComputerDesktopIcon> = {
  desktop: ComputerDesktopIcon,
  tablet: DeviceTabletIcon,
  mobile: DevicePhoneMobileIcon,
};

export function ViewportChips({ viewports }: { viewports: { width: number; height: number }[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {viewports.map((viewport) => {
        const Icon = DEVICE_ICONS[deviceKind(viewport.width)];
        return (
          <span
            key={`${viewport.width}x${viewport.height}`}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600"
            title={`${viewport.width}×${viewport.height}`}
          >
            <Icon aria-hidden className="size-3 text-zinc-400" />
            {viewport.width}
            <span className="sr-only">
              {' '}
              by {viewport.height} ({deviceKind(viewport.width)})
            </span>
          </span>
        );
      })}
    </span>
  );
}
