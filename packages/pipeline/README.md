# @design-validator/pipeline

Audit orchestration: the only package that composes inspection, design import, matching, comparison and visual diff.

- **Inline mode** (`runAudit`) runs every stage in one process. Used when no queue is configured — notably on Vercel,
  where the web app runs the pipeline in the background of the request (`after()`).
- **Queue mode** (`enqueueAudit` + `stageProcessors`) fans stages out to the BullMQ workers in `workers/`.

Both modes call the same stage functions in `src/stages`, record idempotent stage runs, and write artifacts under
deterministic object keys, so a retry never duplicates screenshots, issues or records.

The web app talks to this package's services (`createAudit`, `createFigmaDesignSource`, ...) and never to the domain
packages directly.
