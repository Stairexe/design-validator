import type { DesignSpec } from '@design-validator/design-spec';

import type { FigmaClient } from './client';
import { figmaToDesignSpec, type FigmaTarget } from './normalize';

/** Fetches the target frames and normalizes them into a DesignSpec. */
export async function importFigmaDesign(
  client: FigmaClient,
  fileKey: string,
  targets: FigmaTarget[],
): Promise<DesignSpec> {
  const response = await client.getNodes(
    fileKey,
    targets.map((target) => target.nodeId),
  );
  return figmaToDesignSpec({ fileKey, response, targets });
}
