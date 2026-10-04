import 'server-only';

import { PipelineError, type PipelineFailureCode } from '@design-validator/jobs';
import { toPipelineError } from '@design-validator/pipeline';
import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { getDeps } from './runtime';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (what: string) => new HttpError(404, 'NOT_FOUND', `${what} not found.`);

const STATUS_FOR: Partial<Record<PipelineFailureCode, number>> = {
  INVALID_URL: 422,
  DESIGN_SOURCE_INVALID: 422,
  XD_MANIFEST_INVALID: 422,
  FIGMA_AUTH_FAILED: 422,
  FIGMA_NODE_NOT_FOUND: 422,
  FIGMA_RATE_LIMITED: 429,
  FIGMA_REQUEST_FAILED: 502,
  AI_PROVIDER_FAILED: 502,
};

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  const failure = error instanceof PipelineError ? error : toPipelineError(error);
  const status = STATUS_FOR[failure.code] ?? 500;
  if (status === 500)
    getDeps().logger.error('request failed', { code: failure.code, error: failure.message });
  const message =
    status === 500 ? 'Something went wrong. The error has been logged.' : failure.message;
  return NextResponse.json({ error: { code: failure.code, message } }, { status });
}

/** Wraps a route handler with uniform error handling. */
export function handle<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'The request body must be JSON.');
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      result.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; '),
    );
  }
  return result.data;
}

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
