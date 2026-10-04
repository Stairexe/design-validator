/**
 * BullMQ queue names. Each queue is consumed by the worker package of the
 * same name under `workers/`.
 */
export const QUEUE_NAMES = {
  websiteInspection: 'website-inspection',
  figmaImport: 'figma-import',
  xdImport: 'xd-import',
  comparison: 'comparison',
  visualDiff: 'visual-diff',
  aiExplanation: 'ai-explanation',
  cleanup: 'cleanup',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUE_NAMES: readonly QueueName[] = Object.values(QUEUE_NAMES);
