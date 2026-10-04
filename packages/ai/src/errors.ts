export type AiErrorReason =
  'not-configured' | 'refused' | 'invalid-output' | 'provider-error' | 'rate-limited';

/** AI failure. Never fails an audit: callers show an "unavailable" state. */
export class AiProviderError extends Error {
  readonly code = 'AI_PROVIDER_FAILED' as const;
  readonly reason: AiErrorReason;

  constructor(reason: AiErrorReason, message: string, options: { cause?: unknown } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AiProviderError';
    this.reason = reason;
  }
}
