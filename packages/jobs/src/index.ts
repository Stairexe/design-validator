export {
  AUDIT_STAGES,
  AUDIT_STATUSES,
  AUDIT_TERMINAL_STATUSES,
  isTerminalStatus,
} from './audit-status';
export type { AuditStage, AuditStatus } from './audit-status';
export { bootStageWorker } from './boot';
export { createRedisConnection } from './connection';
export { idempotencyKey, jobEnvelopeSchema } from './envelope';
export type { IdempotencyKeyInput, JobEnvelope } from './envelope';
export { PIPELINE_FAILURE_CODES, PipelineError } from './failures';
export type { PipelineFailureCode } from './failures';
export { createLogger } from './logger';
export type { LogFields, LogLevel, LogSink, Logger } from './logger';
export { ALL_QUEUE_NAMES, QUEUE_NAMES } from './queues';
export type { QueueName } from './queues';
export { closeOnSignals, startWorker } from './worker';
export type { StageJobContext, StageProcessor, StartWorkerOptions, WorkerHandle } from './worker';

// Re-exported so stage processors can fail without depending on BullMQ directly.
export { UnrecoverableError } from 'bullmq';
