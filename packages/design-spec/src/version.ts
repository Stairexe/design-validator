/**
 * Version of the DesignSpec schema produced by every source adapter.
 *
 * Removing or reinterpreting a field requires a version increment and a
 * migration in `migrations.ts` (see design-spec.md, "Versioning").
 */
export const DESIGN_SPEC_SCHEMA_VERSION = '1.0.0';

export const SUPPORTED_SCHEMA_VERSIONS = ['0.1.0', '1.0.0'] as const;
