import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';

import { processComparison } from './processor';

bootStageWorker(QUEUE_NAMES.comparison, processComparison);
