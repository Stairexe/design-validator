'use client';

import type { ValidationIssue } from '@design-validator/design-spec';

export interface IssueAssistanceProps {
  auditId: string;
  issue: ValidationIssue;
  aiAvailable: boolean;
  sourceAvailable: boolean;
}

/** AI explanation and source-code location for an issue (Phases 8 and 10). */
export function IssueAssistance(props: IssueAssistanceProps) {
  void props;
  return null;
}
