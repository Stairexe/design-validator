import { QUEUE_NAMES, bootStageWorker, createRedisConnection } from '@design-validator/jobs';
import { createRuntime, stageProcessors } from '@design-validator/pipeline';
import { Queue } from 'bullmq';

const { deps, redisUrl } = createRuntime(process.env, 'worker-comparison');
const aiQueue = new Queue(QUEUE_NAMES.aiExplanation, {
  connection: createRedisConnection(redisUrl ?? ''),
});

const processors = stageProcessors(deps, {
  enqueueAiExplanation: async (envelope) => {
    await aiQueue.add('ai-explanation', envelope, {
      jobId: `ai-${envelope.auditId}-${envelope.inputHash}`,
      attempts: 2,
    });
  },
});

bootStageWorker(QUEUE_NAMES.comparison, processors.comparison);
