import { PipelineError, type PipelineFailureCode } from '@design-validator/jobs';
import { FigmaError } from '@design-validator/figma-parser';
import { InspectorError } from '@design-validator/web-inspector';
import { XdManifestError } from '@design-validator/xd-parser';
import { DesignSpecValidationError } from '@design-validator/design-spec';

/** Maps any stage error to a typed pipeline failure (architecture.md §8). */
export function toPipelineError(
  error: unknown,
  fallback: PipelineFailureCode = 'INTERNAL_ERROR',
): PipelineError {
  if (error instanceof PipelineError) return error;
  if (error instanceof InspectorError)
    return new PipelineError(error.code, error.message, {
      retryable: error.retryable,
      cause: error,
    });
  if (error instanceof FigmaError) {
    const code: PipelineFailureCode =
      error.code === 'FIGMA_INVALID_URL' ? 'DESIGN_SOURCE_INVALID' : error.code;
    return new PipelineError(code, error.message, { retryable: error.retryable, cause: error });
  }
  if (error instanceof XdManifestError)
    return new PipelineError('XD_MANIFEST_INVALID', error.message, { cause: error });
  if (error instanceof DesignSpecValidationError)
    return new PipelineError('DESIGN_SOURCE_INVALID', error.message, { cause: error });
  const message = error instanceof Error ? error.message : String(error);
  return new PipelineError(fallback, message.split('\n')[0] ?? 'Unexpected error', {
    cause: error,
  });
}
