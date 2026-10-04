import type { AuditStatus } from '@design-validator/database';
import type { IssueCategory, IssueSeverity } from '@design-validator/design-spec';

import type { BadgeTone } from '@/components/ui/badge';

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  position: 'Position',
  size: 'Size',
  spacing: 'Spacing',
  typography: 'Typography',
  color: 'Color',
  border: 'Border',
  radius: 'Radius',
  effect: 'Effects',
  layout: 'Layout',
  responsive: 'Responsive',
  structure: 'Structure',
};

export const SEVERITY_TONE: Record<IssueSeverity, BadgeTone> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
  info: 'info',
};

export const STATUS_LABELS: Record<AuditStatus, string> = {
  QUEUED: 'Queued',
  INSPECTING_WEBSITE: 'Inspecting website',
  IMPORTING_DESIGN: 'Importing design',
  NORMALIZING: 'Normalizing',
  MATCHING: 'Matching elements',
  COMPARING: 'Comparing properties',
  VISUAL_DIFF: 'Visual comparison',
  AI_RECOMMENDATIONS: 'Recommendations',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export function statusTone(status: AuditStatus): BadgeTone {
  if (status === 'COMPLETED') return 'success';
  if (status === 'FAILED') return 'danger';
  if (status === 'CANCELLED') return 'neutral';
  return 'info';
}

export function formatDateTime(iso: string): string {
  return (
    new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(iso)) + ' UTC'
  );
}

export const differenceCount = (count: number) => `${count} difference${count === 1 ? '' : 's'}`;

const TERMINAL_STATUSES = new Set<AuditStatus>(['COMPLETED', 'FAILED', 'CANCELLED']);

export const isRunning = (status: AuditStatus) => !TERMINAL_STATUSES.has(status);

/** `https://www.example.com/pricing` → `example.com/pricing`. */
export function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${parsed.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return url;
  }
}

/** "5 min ago", falling back to a date after a week. Server components only (uses now). */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(iso),
  );
}

export type DeviceKind = 'desktop' | 'tablet' | 'mobile';

export const deviceKind = (width: number): DeviceKind =>
  width < 600 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

/** One colour per category so differences scan at a glance. */
export const CATEGORY_COLORS: Record<IssueCategory, string> = {
  position: 'bg-sky-200',
  size: 'bg-pop-200',
  spacing: 'bg-brand-200',
  typography: 'bg-pink-200',
  color: 'bg-zest-300',
  border: 'bg-amber-200',
  radius: 'bg-teal-200',
  effect: 'bg-fuchsia-200',
  layout: 'bg-indigo-200',
  responsive: 'bg-cyan-200',
  structure: 'bg-zinc-200',
};
