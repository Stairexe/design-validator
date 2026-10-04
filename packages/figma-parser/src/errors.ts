export type FigmaErrorCode =
  | 'FIGMA_AUTH_FAILED'
  | 'FIGMA_NODE_NOT_FOUND'
  | 'FIGMA_RATE_LIMITED'
  | 'FIGMA_REQUEST_FAILED'
  | 'FIGMA_INVALID_URL';

export class FigmaError extends Error {
  readonly code: FigmaErrorCode;
  readonly retryable: boolean;

  constructor(
    code: FigmaErrorCode,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'FigmaError';
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
