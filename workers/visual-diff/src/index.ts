import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';

import { processVisualDiff } from './processor';

bootStageWorker(QUEUE_NAMES.visualDiff, processVisualDiff);
