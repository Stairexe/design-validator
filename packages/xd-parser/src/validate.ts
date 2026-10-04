import { xdManifestSchema, type XdManifest } from './manifest-schema';

export class XdManifestError extends Error {
  readonly code = 'XD_MANIFEST_INVALID' as const;
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Invalid Adobe XD manifest:\n${issues
        .slice(0, 10)
        .map((issue) => `  - ${issue}`)
        .join('\n')}`,
    );
    this.name = 'XdManifestError';
    this.issues = issues;
  }
}

/** Validates an uploaded manifest (schema and version). */
export function validateXdManifest(input: unknown): XdManifest {
  const result = xdManifestSchema.safeParse(input);
  if (!result.success) {
    throw new XdManifestError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return result.data;
}
