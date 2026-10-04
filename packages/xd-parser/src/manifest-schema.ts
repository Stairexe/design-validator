import { z } from 'zod';

/**
 * Manifest exported by the Design Validator Adobe XD plugin (plugins/adobe-xd).
 * Coordinates are relative to the artboard origin; colours are `#rrggbb` with
 * a separate alpha. Raw XD binaries are never parsed.
 */
export const XD_MANIFEST_VERSION = '1.0';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const alpha = z.number().min(0).max(1);
const bounds = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().min(0),
  height: z.number().min(0),
});

const fill = z.discriminatedUnion('type', [
  z.object({ type: z.literal('color'), color, alpha: alpha.default(1) }),
  z.object({ type: z.literal('image') }),
  z.object({ type: z.literal('gradient') }),
]);

const text = z.object({
  content: z.string(),
  fontFamily: z.string(),
  fontStyle: z.string().default('Regular'),
  fontSize: z.number().positive(),
  /** XD character spacing in 1/1000 em. */
  charSpacing: z.number().default(0),
  /** XD line spacing in px; 0 means automatic. */
  lineSpacing: z.number().min(0).default(0),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'titlecase']).default('none'),
  underline: z.boolean().default(false),
  strikethrough: z.boolean().default(false),
  color,
  alpha: alpha.default(1),
});

export interface XdNode {
  guid: string;
  name: string;
  type: string;
  visible: boolean;
  bounds: z.infer<typeof bounds>;
  opacity: number;
  fill?: z.infer<typeof fill> | undefined;
  stroke?:
    { color: string; alpha: number; width: number; enabled: boolean; dashed: boolean } | undefined;
  cornerRadii?:
    { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number } | undefined;
  shadow?:
    | { x: number; y: number; blur: number; color: string; alpha: number; visible: boolean }
    | undefined;
  text?: z.infer<typeof text> | undefined;
  layout?:
    | {
        type: 'stack';
        orientation: 'horizontal' | 'vertical';
        spacing: number;
        padding: { top: number; right: number; bottom: number; left: number };
      }
    | undefined;
  symbolName?: string | undefined;
  children?: XdNode[] | undefined;
}

export const xdNodeSchema: z.ZodType<XdNode> = z.lazy(() =>
  z.object({
    guid: z.string().min(1),
    name: z.string(),
    type: z.string().min(1),
    visible: z.boolean().default(true),
    bounds,
    opacity: z.number().min(0).max(1).default(1),
    fill: fill.optional(),
    stroke: z
      .object({
        color,
        alpha: alpha.default(1),
        width: z.number().min(0),
        enabled: z.boolean().default(true),
        dashed: z.boolean().default(false),
      })
      .optional(),
    cornerRadii: z
      .object({
        topLeft: z.number(),
        topRight: z.number(),
        bottomRight: z.number(),
        bottomLeft: z.number(),
      })
      .optional(),
    shadow: z
      .object({
        x: z.number(),
        y: z.number(),
        blur: z.number().min(0),
        color,
        alpha: alpha.default(1),
        visible: z.boolean().default(true),
      })
      .optional(),
    text: text.optional(),
    layout: z
      .object({
        type: z.literal('stack'),
        orientation: z.enum(['horizontal', 'vertical']),
        spacing: z.number(),
        padding: z
          .object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() })
          .default({ top: 0, right: 0, bottom: 0, left: 0 }),
      })
      .optional(),
    symbolName: z.string().optional(),
    children: z.array(xdNodeSchema).optional(),
  }),
);

export const xdManifestSchema = z.object({
  manifestVersion: z.literal(XD_MANIFEST_VERSION),
  generator: z.object({ name: z.string(), version: z.string() }),
  document: z.object({ name: z.string(), guid: z.string().optional() }),
  exportedAt: z.string().optional(),
  artboards: z
    .array(
      z.object({
        guid: z.string().min(1),
        name: z.string(),
        width: z.number().positive(),
        height: z.number().positive(),
        fill: fill.optional(),
        children: z.array(xdNodeSchema),
      }),
    )
    .min(1, 'the manifest contains no artboards'),
});

export type XdManifest = z.infer<typeof xdManifestSchema>;
export type XdArtboard = XdManifest['artboards'][number];
