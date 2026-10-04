import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';
import { createRuntime, stageProcessors } from '@design-validator/pipeline';

const { deps } = createRuntime(process.env, 'worker-ai-explanation');

bootStageWorker(QUEUE_NAMES.aiExplanation, stageProcessors(deps).aiExplanation);
