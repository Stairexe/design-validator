# Adobe XD plugin — Design Validator Export

Exports XD artboards as a Design Validator manifest (version 1.0). Upload the file in
**Project → Add design source → Adobe XD**. Raw `.xd` files are never parsed.

## Build and install

```bash
pnpm --filter @design-validator/adobe-xd-plugin build   # writes dist/main.js + dist/manifest.json
```

In Adobe XD: **Plugins → Development → Load Plugin…** and choose `plugins/adobe-xd/dist`. Then select one or more
artboards (or none, to export all) and run **Plugins → Export for Design Validator**.

## What is exported

Per node: GUID, name, scenegraph type, visibility, opacity, artboard-relative bounds, solid fills, strokes, corner
radii, drop shadow, text properties (family, style, size, character spacing, line spacing, alignment, transform,
decoration, colour), stack layout (orientation, spacing, padding) and component (symbol) names. Image and gradient fills
are marked by type only. The schema is defined by `packages/xd-parser/src/manifest-schema.ts`.

The conversion (`src/scenegraph.ts`) is a pure function, unit-tested against the parser's schema; `src/main.ts` is the
thin XD entry point and requires Adobe XD to run.
