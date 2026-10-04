import { z } from 'zod';

import { DESIGN_ELEMENT_TYPES, DESIGN_ROLES, type DesignSpec } from './types';
import { DESIGN_SPEC_SCHEMA_VERSION } from './version';

const length = z.number().nullable();
const optionalLength = length.optional();
const nullableString = z.string().nullable().optional();

export const colorValueSchema = z.object({
  hex: z.string().regex(/^#[0-9a-f]{6}$/, 'must be lowercase #rrggbb'),
  alpha: z.number().min(0).max(1),
});

const boxSpacingSchema = z.object({
  top: length,
  right: length,
  bottom: length,
  left: length,
});

export const boundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().min(0),
  height: z.number().min(0),
});

const typographySchema = z.object({
  fontFamily: nullableString,
  fontSize: optionalLength,
  fontWeight: z.number().min(1).max(1000).nullable().optional(),
  lineHeight: z
    .union([z.number(), z.literal('normal')])
    .nullable()
    .optional(),
  letterSpacing: optionalLength,
  textTransform: nullableString,
  textAlign: nullableString,
  textDecoration: nullableString,
  fontStyle: nullableString,
  color: colorValueSchema.nullable().optional(),
});

const shadowSchema = z.object({
  x: z.number(),
  y: z.number(),
  blur: z.number(),
  spread: z.number(),
  color: colorValueSchema,
  inset: z.boolean(),
});

const elementSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  type: z.enum(DESIGN_ELEMENT_TYPES),
  role: z.enum(DESIGN_ROLES).optional(),
  parentId: z.string().nullable().optional(),
  childIds: z.array(z.string()),
  text: z.string().optional(),
  bounds: boundsSchema,
  visibility: z.object({
    visible: z.boolean(),
    reason: z
      .enum(['display-none', 'visibility-hidden', 'opacity-zero', 'zero-size', 'hidden-in-design'])
      .optional(),
  }),
  layout: z.object({
    display: nullableString,
    position: nullableString,
    flexDirection: nullableString,
    alignItems: nullableString,
    justifyContent: nullableString,
    flexWrap: nullableString,
    gridTemplateColumns: nullableString,
    gridTemplateRows: nullableString,
    overflow: nullableString,
  }),
  spacing: z.object({
    margin: boxSpacingSchema.optional(),
    padding: boxSpacingSchema.optional(),
    gap: optionalLength,
    rowGap: optionalLength,
    columnGap: optionalLength,
  }),
  typography: typographySchema.optional(),
  colors: z.object({
    text: colorValueSchema.nullable().optional(),
    background: colorValueSchema.nullable().optional(),
    fill: colorValueSchema.nullable().optional(),
    border: colorValueSchema.nullable().optional(),
  }),
  border: z.object({
    width: boxSpacingSchema,
    style: nullableString,
    color: colorValueSchema.nullable().optional(),
  }),
  radius: z.object({
    topLeft: optionalLength,
    topRight: optionalLength,
    bottomRight: optionalLength,
    bottomLeft: optionalLength,
  }),
  effects: z.object({
    shadows: z.array(shadowSchema).nullable().optional(),
    opacity: z.number().min(0).max(1).nullable().optional(),
    filter: nullableString,
    transform: nullableString,
  }),
  source: z.object({
    provider: z.enum(['website', 'figma', 'adobe-xd']),
    sourceId: z.string().optional(),
    sourcePath: z.string().optional(),
    selector: z.string().optional(),
    originalType: z.string().optional(),
    classNames: z.array(z.string()).optional(),
    attributes: z.record(z.string(), z.string()).optional(),
    rawReference: z.string().max(2048, 'rawReference must be a pointer, not a payload').optional(),
  }),
  responsive: z
    .object({
      visibilityByViewport: z.record(z.string(), z.boolean()).optional(),
      boundsByViewport: z.record(z.string(), boundsSchema).optional(),
      typographyByViewport: z.record(z.string(), typographySchema).optional(),
    })
    .optional(),
});

export const designSpecSchema = z
  .object({
    schemaVersion: z.literal(DESIGN_SPEC_SCHEMA_VERSION),
    source: z.object({
      type: z.enum(['website', 'figma', 'adobe-xd']),
      id: z.string().optional(),
      name: z.string().optional(),
      uri: z.string().optional(),
      version: z.string().optional(),
    }),
    document: z.object({
      id: z.string().min(1),
      name: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
    viewports: z.array(
      z.object({
        id: z.string().min(1),
        width: z.number().positive(),
        height: z.number().positive(),
        devicePixelRatio: z.number().positive().optional(),
        label: z.string().optional(),
      }),
    ),
    pages: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        viewportId: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        rootIds: z.array(z.string()),
        elements: z.array(elementSchema),
      }),
    ),
    tokens: z
      .array(
        z.object({
          name: z.string(),
          type: z.enum(['color', 'dimension', 'typography', 'shadow', 'other']),
          value: z.unknown(),
        }),
      )
      .optional(),
    metadata: z.record(z.string(), z.unknown()),
  })
  .superRefine((spec, ctx) => {
    // Referential integrity: hierarchy IDs must resolve within each page.
    spec.pages.forEach((page, pageIndex) => {
      const ids = new Set<string>();
      page.elements.forEach((element, elementIndex) => {
        if (ids.has(element.id)) {
          ctx.addIssue({
            code: 'custom',
            message: `duplicate element id ${element.id}`,
            path: ['pages', pageIndex, 'elements', elementIndex, 'id'],
          });
        }
        ids.add(element.id);
      });
      const check = (id: string | null | undefined, path: (string | number)[]) => {
        if (id && !ids.has(id)) {
          ctx.addIssue({ code: 'custom', message: `unknown element id ${id}`, path });
        }
      };
      page.rootIds.forEach((id, i) => {
        check(id, ['pages', pageIndex, 'rootIds', i]);
      });
      page.elements.forEach((element, elementIndex) => {
        check(element.parentId, ['pages', pageIndex, 'elements', elementIndex, 'parentId']);
        element.childIds.forEach((id, i) => {
          check(id, ['pages', pageIndex, 'elements', elementIndex, 'childIds', i]);
        });
      });
    });
  });

export class DesignSpecValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Invalid DesignSpec:\n${issues
        .slice(0, 20)
        .map((issue) => `  - ${issue}`)
        .join('\n')}`,
    );
    this.name = 'DesignSpecValidationError';
    this.issues = issues;
  }
}

export type ValidationResult =
  { success: true; spec: DesignSpec } | { success: false; issues: string[] };

export function validateDesignSpec(input: unknown): ValidationResult {
  const result = designSpecSchema.safeParse(input);
  if (result.success) {
    return { success: true, spec: result.data as DesignSpec };
  }
  return {
    success: false,
    issues: result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    ),
  };
}

/** Validates and returns the spec, throwing `DesignSpecValidationError` otherwise. */
export function parseDesignSpec(input: unknown): DesignSpec {
  const result = validateDesignSpec(input);
  if (!result.success) {
    throw new DesignSpecValidationError(result.issues);
  }
  return result.spec;
}
