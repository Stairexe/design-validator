import type { z } from 'zod';

export type EnvSource = Readonly<Record<string, string | undefined>>;

/** Thrown when required environment variables are missing or malformed. */
export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`,
    );
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

/**
 * Validates `source` (defaults to `process.env`) against `schema`.
 *
 * Empty strings are treated as unset so `.env.example`-style blank values
 * behave like missing optional variables. Error messages name the variable
 * but never echo its value, so secrets cannot leak into logs.
 */
export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  source: EnvSource = process.env,
): z.infer<TSchema> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== '') {
      normalized[key] = value;
    }
  }

  const result = schema.safeParse(normalized);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return result.data;
}
