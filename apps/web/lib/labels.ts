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
