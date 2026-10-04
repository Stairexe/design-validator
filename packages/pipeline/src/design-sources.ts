import { randomUUID } from 'node:crypto';

import type { DesignFrame, DesignSourceRecord } from '@design-validator/database';
import {
  FigmaClient,
  parseFigmaUrl,
  type FigmaNodesResponse,
} from '@design-validator/figma-parser';
import { PipelineError } from '@design-validator/jobs';
import { validateXdManifest, type XdManifest } from '@design-validator/xd-parser';

import { artifactKeys, putJson } from './artifacts';
import type { PipelineDependencies } from './deps';
import { toPipelineError } from './failures';
import { SAMPLE_FILE_KEY, SAMPLE_FIGMA_NODES } from './sample';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function framesFromNodes(response: FigmaNodesResponse): DesignFrame[] {
  return Object.entries(response.nodes).flatMap(([nodeId, entry]) => {
    const box = entry?.document.absoluteBoundingBox;
    return entry
      ? [
          {
            nodeId,
            name: entry.document.name,
            width: box?.width ?? null,
            height: box?.height ?? null,
          },
        ]
      : [];
  });
}

async function requireProject(deps: PipelineDependencies, projectId: string) {
  const project = await deps.repository.getProject(projectId);
  if (!project) throw new PipelineError('DESIGN_SOURCE_INVALID', 'Project not found.');
  return project;
}

/** Lists selectable frames of a Figma file via the server token. */
export async function listFigmaFrames(deps: PipelineDependencies, figmaUrl: string) {
  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);
  if (!deps.figmaAccessToken) {
    throw new PipelineError(
      'FIGMA_AUTH_FAILED',
      'No Figma access token is configured on the server. Upload a Figma export instead.',
    );
  }
  const client = new FigmaClient({
    accessToken: deps.figmaAccessToken,
    ...(deps.fetch ? { fetch: deps.fetch } : {}),
  });
  const file = await client.listFrames(fileKey);
  return { fileKey, nodeId: nodeId ?? null, ...file };
}

/**
 * Creates a Figma design source either from a file URL (frames listed through
 * the API) or from an uploaded `GET /v1/files/:key/nodes` export.
 */
export async function createFigmaDesignSource(
  deps: PipelineDependencies,
  input: {
    projectId: string;
    name?: string | undefined;
    figmaUrl?: string | undefined;
    nodesExport?: unknown;
  },
): Promise<DesignSourceRecord> {
  await requireProject(deps, input.projectId);
  try {
    if (input.nodesExport !== undefined) {
      const response = input.nodesExport as FigmaNodesResponse;
      if (typeof response !== 'object' || typeof response.nodes !== 'object') {
        throw new PipelineError(
          'DESIGN_SOURCE_INVALID',
          'The upload is not a Figma nodes export (expected a "nodes" object).',
        );
      }
      if (JSON.stringify(response).length > MAX_UPLOAD_BYTES)
        throw new PipelineError('DESIGN_SOURCE_INVALID', 'The Figma export exceeds 10 MB.');
      const frames = framesFromNodes(response);
      if (frames.length === 0)
        throw new PipelineError('DESIGN_SOURCE_INVALID', 'The Figma export contains no frames.');
      const fileKey = input.figmaUrl ? parseFigmaUrl(input.figmaUrl).fileKey : null;
      const uploadObjectKey = await storeUpload(deps, 'figma-nodes.json', response);
      return await deps.repository.createDesignSource({
        projectId: input.projectId,
        kind: 'figma',
        name: input.name ?? (response.name || 'Figma export'),
        uri: input.figmaUrl ?? null,
        fileKey,
        revision: response.version ?? null,
        frames,
        uploadObjectKey,
      });
    }

    if (!input.figmaUrl)
      throw new PipelineError('DESIGN_SOURCE_INVALID', 'Provide a Figma file URL or an export.');
    const listing = await listFigmaFrames(deps, input.figmaUrl);
    const frames = listing.pages.flatMap((page) =>
      page.frames.map((frame) => ({
        nodeId: frame.id,
        name: `${page.name} / ${frame.name}`,
        width: frame.width,
        height: frame.height,
      })),
    );
    if (frames.length === 0)
      throw new PipelineError('DESIGN_SOURCE_INVALID', 'The Figma file has no top-level frames.');
    return await deps.repository.createDesignSource({
      projectId: input.projectId,
      kind: 'figma',
      name: input.name ?? listing.name,
      uri: input.figmaUrl,
      fileKey: listing.fileKey,
      revision: null,
      frames,
      uploadObjectKey: null,
    });
  } catch (error) {
    throw toPipelineError(error, 'DESIGN_SOURCE_INVALID');
  }
}

/** Creates an Adobe XD source from a plugin manifest (validated before storing). */
export async function createXdDesignSource(
  deps: PipelineDependencies,
  input: { projectId: string; name?: string | undefined; manifest: unknown },
): Promise<DesignSourceRecord> {
  await requireProject(deps, input.projectId);
  let manifest: XdManifest;
  try {
    manifest = validateXdManifest(input.manifest);
  } catch (error) {
    throw toPipelineError(error);
  }
  const uploadObjectKey = await storeUpload(deps, 'xd-manifest.json', manifest);
  return deps.repository.createDesignSource({
    projectId: input.projectId,
    kind: 'adobe-xd',
    name: input.name ?? manifest.document.name,
    uri: null,
    fileKey: null,
    revision: manifest.exportedAt ?? null,
    frames: manifest.artboards.map((artboard) => ({
      nodeId: artboard.guid,
      name: artboard.name,
      width: artboard.width,
      height: artboard.height,
    })),
    uploadObjectKey,
  });
}

/** The built-in sample design (no credentials needed). */
export async function createSampleDesignSource(
  deps: PipelineDependencies,
  projectId: string,
): Promise<DesignSourceRecord> {
  await requireProject(deps, projectId);
  const uploadObjectKey = await storeUpload(deps, 'figma-nodes.json', SAMPLE_FIGMA_NODES);
  return deps.repository.createDesignSource({
    projectId,
    kind: 'figma',
    name: 'Sample: Pricing (Figma export)',
    uri: null,
    fileKey: SAMPLE_FILE_KEY,
    revision: SAMPLE_FIGMA_NODES.version ?? null,
    frames: framesFromNodes(SAMPLE_FIGMA_NODES),
    uploadObjectKey,
  });
}

/** Uploads live under their own ID so a source record only ever references a complete upload. */
async function storeUpload(
  deps: PipelineDependencies,
  name: 'figma-nodes.json' | 'xd-manifest.json',
  payload: unknown,
): Promise<string> {
  const key = artifactKeys.upload(randomUUID(), name);
  await putJson(deps.storage, key, payload);
  return key;
}
