import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';

import { processFigmaImport } from './processor';

bootStageWorker(QUEUE_NAMES.figmaImport, processFigmaImport);
