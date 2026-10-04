import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';

import { processAiExplanation } from './processor';

bootStageWorker(QUEUE_NAMES.aiExplanation, processAiExplanation);
