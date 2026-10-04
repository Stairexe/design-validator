import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';

import { processCleanup } from './processor';

bootStageWorker(QUEUE_NAMES.cleanup, processCleanup);
