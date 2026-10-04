import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';

import { processXdImport } from './processor';

bootStageWorker(QUEUE_NAMES.xdImport, processXdImport);
