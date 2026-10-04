'use client';

import type { ValidationIssue } from '@design-validator/design-spec';

import { AiRecommendation } from './ai-recommendation';
import { SourceLocation } from './source-location';

export interface IssueAssistanceProps {
  auditId: string;
  issue: ValidationIssue;
  aiAvailable: boolean;
  sourceAvailable: boolean;
}

/** AI explanation (Phase 8) and source-code location (Phase 10) for an issue. */
export function IssueAssistance({
  auditId,
  issue,
  aiAvailable,
  sourceAvailable,
}: IssueAssistanceProps) {
  return (
    <>
      <SourceLocation auditId={auditId} issue={issue} available={sourceAvailable} />
      {issue.category !== 'structure' ? (
        <AiRecommendation auditId={auditId} issue={issue} available={aiAvailable} />
      ) : null}
    </>
  );
}
