import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';
import { createRuntime, stageProcessors } from '@design-validator/pipeline';

const { deps } = createRuntime(process.env, 'worker-website-inspection');
const processors = stageProcessors(deps);

bootStageWorker(QUEUE_NAMES.websiteInspection, processors.websiteInspection);
