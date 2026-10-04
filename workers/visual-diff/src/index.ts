import { QUEUE_NAMES, bootStageWorker } from '@design-validator/jobs';
import { createRuntime } from '@design-validator/pipeline';

import { createVisualDiffProcessor } from './processor';

const { deps } = createRuntime(process.env, 'worker-visual-diff');

bootStageWorker(QUEUE_NAMES.visualDiff, createVisualDiffProcessor(deps));
