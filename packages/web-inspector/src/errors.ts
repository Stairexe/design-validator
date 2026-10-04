export type InspectorErrorCode =
  | 'INVALID_URL'
  | 'NAVIGATION_TIMEOUT'
  | 'AUTH_REQUIRED'
  | 'PAGE_RENDER_FAILED'
  | 'NO_VISIBLE_ELEMENTS';

/** Typed inspection failure; the pipeline maps `code` onto its failure codes. */
export class InspectorError extends Error {
  readonly code: InspectorErrorCode;
  readonly retryable: boolean;

  constructor(
    code: InspectorErrorCode,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'InspectorError';
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
