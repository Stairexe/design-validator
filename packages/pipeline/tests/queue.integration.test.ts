import { DocumentAuditRepository } from '@design-validator/database';
import {
  QUEUE_NAMES,
  createLogger,
  createRedisConnection,
  startWorker,
  type WorkerHandle,
} from '@design-validator/jobs';
import { MemoryObjectStorage } from '@design-validator/storage';
import { localBrowserProvider } from '@design-validator/web-inspector';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startFixtureServer } from '../../web-inspector/tests/fixture-server';
import {
  SAMPLE_VIEWPORTS,
  createAudit,
  createSampleDesignSource,
  enqueueAudit,
  stageProcessors,
  type PipelineDependencies,
} from '../src';

const redisUrl = process.env['REDIS_URL'];

// Queue mode end to end: FlowProducer → stage workers → completed audit. Requires Redis.
describe.runIf(redisUrl)(
  'enqueueAudit (Redis + Chromium integration)',
  { timeout: 120_000 },
  () => {
    const connection = createRedisConnection(redisUrl ?? '');
    const storage = new MemoryObjectStorage();
    const deps: PipelineDependencies = {
      repository: new DocumentAuditRepository(storage),
      storage,
      browserProvider: localBrowserProvider(),
      logger: createLogger({}, { sink: () => undefined }),
      allowPrivateHosts: true,
    };
    const workers: WorkerHandle[] = [];
    let server: Awaited<ReturnType<typeof startFixtureServer>>;

    beforeAll(async () => {
      server = await startFixtureServer();
      const processors = stageProcessors(deps);
      const logger = createLogger({}, { sink: () => undefined });
      workers.push(
        startWorker({
          queueName: QUEUE_NAMES.websiteInspection,
          processor: processors.websiteInspection,
          connection,
          logger,
        }),
        startWorker({
          queueName: QUEUE_NAMES.figmaImport,
          processor: processors.designImport,
          connection,
          logger,
        }),
        startWorker({
          queueName: QUEUE_NAMES.comparison,
          processor: processors.comparison,
          connection,
          logger,
        }),
      );
      await Promise.all(workers.map((handle) => handle.worker.waitUntilReady()));
    });

    afterAll(async () => {
      await Promise.all(workers.map((handle) => handle.close()));
      await connection.quit();
      await server.close();
    });

    it('runs stages on their workers and completes the audit', async () => {
      const project = await deps.repository.createProject({
        name: 'Queued',
        websiteUrl: `${server.url}/pricing.html`,
      });
      const source = await createSampleDesignSource(deps, project.id);
      const audit = await createAudit(deps, {
        projectId: project.id,
        designSourceId: source.id,
        viewports: SAMPLE_VIEWPORTS,
        settings: { visualDiff: false },
      });
      await enqueueAudit(connection, audit, 'figma', 'test-correlation');
      // Re-enqueueing the same audit is a no-op thanks to idempotent job IDs.
      await enqueueAudit(connection, audit, 'figma', 'test-correlation');

      const deadline = Date.now() + 90_000;
      let status = audit.status;
      while (Date.now() < deadline && !['COMPLETED', 'FAILED'].includes(status)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        status = (await deps.repository.getAudit(audit.id))?.status ?? status;
      }
      const finished = await deps.repository.getAudit(audit.id);
      expect(finished).toMatchObject({ status: 'COMPLETED', failureCode: null });
      expect(finished?.issueCount).toBeGreaterThan(5);
      const comparisonRuns = (await deps.repository.listStageRuns(audit.id)).filter(
        (run) => run.stage === 'COMPARING',
      );
      expect(comparisonRuns).toHaveLength(1);
    });
  },
);
