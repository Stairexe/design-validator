/** Typed stage failures (architecture.md, "Failure strategy"). */
export const PIPELINE_FAILURE_CODES = [
  'INVALID_URL',
  'NAVIGATION_TIMEOUT',
  'AUTH_REQUIRED',
  'PAGE_RENDER_FAILED',
  'NO_VISIBLE_ELEMENTS',
  'FIGMA_AUTH_FAILED',
  'FIGMA_NODE_NOT_FOUND',
  'FIGMA_RATE_LIMITED',
  'FIGMA_REQUEST_FAILED',
  'DESIGN_SOURCE_INVALID',
  'XD_MANIFEST_INVALID',
  'MATCHING_TOO_AMBIGUOUS',
  'COMPARISON_FAILED',
  'VISUAL_DIFF_FAILED',
  'AI_PROVIDER_FAILED',
  'SOURCE_MAPPING_FAILED',
  'INTERNAL_ERROR',
] as const;

export type PipelineFailureCode = (typeof PIPELINE_FAILURE_CODES)[number];

export class PipelineError extends Error {
  readonly code: PipelineFailureCode;
  /** Whether retrying the same input could succeed (e.g. a timeout). */
  readonly retryable: boolean;

  constructor(
    code: PipelineFailureCode,
    message: string,
    options?: { retryable?: boolean; cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'PipelineError';
    this.code = code;
    this.retryable = options?.retryable ?? false;
  }
}
