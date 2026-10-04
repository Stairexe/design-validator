import { z } from 'zod';

/** Request contracts shared by API routes and client forms. */

const httpUrl = z.url().refine((value) => /^https?:\/\//.test(value), 'must be an http(s) URL');

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  websiteUrl: httpUrl,
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  websiteUrl: httpUrl.optional(),
  sourceRepository: z
    .object({
      provider: z.literal('github'),
      owner: z.string().min(1).max(100),
      repo: z.string().min(1).max(100),
      ref: z.string().min(1).max(200).default('main'),
    })
    .nullable()
    .optional(),
});

export const createFigmaSourceSchema = z
  .object({
    projectId: z.string().min(1),
    name: z.string().trim().max(120).optional(),
    figmaUrl: z.url().optional(),
    nodesExport: z.unknown().optional(),
  })
  .refine(
    (value) => value.figmaUrl !== undefined || value.nodesExport !== undefined,
    'Provide a Figma URL or a nodes export.',
  );

export const createXdSourceSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().max(120).optional(),
  manifest: z.unknown(),
});

export const viewportSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/, 'lowercase letters, digits and dashes'),
  width: z.number().int().min(240).max(3840),
  height: z.number().int().min(240).max(4000),
  label: z.string().max(40).optional(),
  designNodeId: z.string().min(1),
});

export const tolerancesSchema = z
  .object({
    positionPx: z.number().min(0).max(100),
    sizePx: z.number().min(0).max(100),
    spacingPx: z.number().min(0).max(100),
    typographyPx: z.number().min(0).max(100),
    colorDelta: z.number().min(0).max(100),
    radiusPx: z.number().min(0).max(100),
    borderPx: z.number().min(0).max(100),
    opacity: z.number().min(0).max(1),
  })
  .partial();

export const createAuditSchema = z.object({
  projectId: z.string().min(1),
  designSourceId: z.string().min(1),
  websiteUrl: httpUrl.optional(),
  viewports: z.array(viewportSchema).min(1).max(6),
  options: z
    .object({
      visualDiff: z.boolean().default(true),
      aiRecommendations: z.boolean().default(false),
      tolerances: tolerancesSchema.default({}),
      explicitMappings: z
        .array(
          z.object({
            designId: z.string().min(1),
            implementationSelector: z.string().min(1).max(500).optional(),
            implementationId: z.string().optional(),
          }),
        )
        .max(200)
        .default([]),
    })
    .default({ visualDiff: true, aiRecommendations: false, tolerances: {}, explicitMappings: [] }),
});

export type CreateAuditBody = z.infer<typeof createAuditSchema>;
