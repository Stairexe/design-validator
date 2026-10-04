import { objectKey, type ObjectStorage } from '@design-validator/storage';

/** Deterministic artifact locations: retries overwrite instead of duplicating. */
export const artifactKeys = {
  websiteSpec: (auditId: string, viewportId: string) =>
    objectKey('audits', auditId, 'viewports', viewportId, 'website.spec.json'),
  websiteScreenshot: (auditId: string, viewportId: string) =>
    objectKey('audits', auditId, 'viewports', viewportId, 'website.png'),
  designImage: (auditId: string, viewportId: string) =>
    objectKey('audits', auditId, 'viewports', viewportId, 'design.png'),
  diffImage: (auditId: string, viewportId: string) =>
    objectKey('audits', auditId, 'viewports', viewportId, 'diff.png'),
  designSpec: (auditId: string) => objectKey('audits', auditId, 'design.spec.json'),
  report: (auditId: string) => objectKey('audits', auditId, 'report.json'),
  visual: (auditId: string) => objectKey('audits', auditId, 'visual.json'),
  upload: (uploadId: string, name: 'figma-nodes.json' | 'xd-manifest.json') =>
    objectKey('uploads', uploadId, name),
};

export const IMAGE_ARTIFACTS = ['website.png', 'design.png', 'diff.png'] as const;
export type ImageArtifact = (typeof IMAGE_ARTIFACTS)[number];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function putJson(storage: ObjectStorage, key: string, value: unknown): Promise<void> {
  await storage.put({
    key,
    body: encoder.encode(JSON.stringify(value)),
    contentType: 'application/json',
  });
}

export async function getJson(storage: ObjectStorage, key: string): Promise<unknown> {
  const stored = await storage.get(key);
  return stored ? (JSON.parse(decoder.decode(stored.body)) as unknown) : null;
}

/** Removes every artifact of an audit (retention and deletion). */
export async function deleteAuditArtifacts(
  storage: ObjectStorage,
  auditId: string,
): Promise<number> {
  const keys = await storage.list(`audits/${auditId}/`);
  for (const key of keys) await storage.delete(key);
  return keys.length;
}
