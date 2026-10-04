import type { AuditStatus } from '@design-validator/database';

import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, isRunning, statusTone } from '@/lib/labels';

export function StatusBadge({ status }: { status: AuditStatus }) {
  const running = isRunning(status);
  return (
    <Badge tone={statusTone(status)} dot pulse={running}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
