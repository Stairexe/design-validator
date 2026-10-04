import 'server-only';

import { HttpError } from './http';
import { getDeps } from './runtime';

/**
 * Per-process abuse limits. On serverless platforms each instance keeps its
 * own counters, so these bound bursts rather than enforce exact global quotas;
 * the daily audit quota is checked against stored audits and is global.
 */
const windows = globalThis as typeof globalThis & {
  __designValidatorRateLimits?: Map<string, number[]>;
  __designValidatorRunning?: { count: number };
};
const hits = (windows.__designValidatorRateLimits ??= new Map<string, number[]>());
export const running = (windows.__designValidatorRunning ??= { count: 0 });

const env = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const LIMITS = {
  get auditsPerHour() {
    return env('RATE_LIMIT_AUDITS_PER_HOUR', 30);
  },
  get aiPerHour() {
    return env('RATE_LIMIT_AI_PER_HOUR', 60);
  },
  get writesPerMinute() {
    return env('RATE_LIMIT_WRITES_PER_MINUTE', 60);
  },
  get concurrentAudits() {
    return env('MAX_CONCURRENT_AUDITS', 2);
  },
  get auditsPerDay() {
    return env('MAX_AUDITS_PER_DAY', 200);
  },
};

export function clientKey(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  );
}

/** Sliding-window rate limit; throws 429 when exceeded. */
export function rateLimit(request: Request, bucket: string, limit: number, windowMs: number): void {
  const key = `${bucket}:${clientKey(request)}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    throw new HttpError(
      429,
      'RATE_LIMITED',
      `Too many requests. Try again in ${Math.ceil((windowMs - (now - (recent[0] ?? now))) / 1000)} seconds.`,
    );
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear();
}

/** Global daily audit quota and per-process concurrency for inline execution. */
export async function enforceAuditCapacity(request: Request): Promise<void> {
  rateLimit(request, 'audits', LIMITS.auditsPerHour, 60 * 60 * 1000);
  if (running.count >= LIMITS.concurrentAudits) {
    throw new HttpError(
      429,
      'BUSY',
      'The validator is busy with other audits. Try again in a minute.',
    );
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await getDeps().repository.listAudits({ limit: LIMITS.auditsPerDay + 1 });
  if (recent.filter((audit) => audit.createdAt >= since).length >= LIMITS.auditsPerDay) {
    throw new HttpError(
      429,
      'QUOTA_EXCEEDED',
      'The daily audit quota for this deployment has been reached.',
    );
  }
}

/** Structured audit log line for a state-changing action. */
export function auditLog(
  request: Request,
  action: string,
  details: Record<string, unknown> = {},
): void {
  getDeps().logger.info('audit-log', { action, client: clientKey(request), ...details });
}
