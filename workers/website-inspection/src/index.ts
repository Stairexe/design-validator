import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';

import { processWebsiteInspection } from './processor';

bootStageWorker(QUEUE_NAMES.websiteInspection, processWebsiteInspection);
