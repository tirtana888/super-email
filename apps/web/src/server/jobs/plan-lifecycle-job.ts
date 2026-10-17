import { Queue, Worker } from "bullmq";
import { logger } from "~/server/logger/log";
import { getRedis, BULL_PREFIX } from "~/server/redis";
import {
  PLAN_LIFECYCLE_QUEUE,
  DEFAULT_QUEUE_OPTIONS,
} from "~/server/queue/queue-constants";
import { sweepPlanLifecycle } from "~/server/service/plan-lifecycle-service";

let initialized = false;

export async function initPlanLifecycleJob() {
  if (initialized) {
    return;
  }

  const connection = getRedis();
  const planLifecycleQueue = new Queue(PLAN_LIFECYCLE_QUEUE, {
    connection,
    prefix: BULL_PREFIX,
    skipVersionCheck: true,
  });

  const worker = new Worker(
    PLAN_LIFECYCLE_QUEUE,
    async () => {
      await sweepPlanLifecycle();
    },
    {
      connection,
      concurrency: 1,
      prefix: BULL_PREFIX,
      skipVersionCheck: true,
    },
  );

  await planLifecycleQueue.upsertJobScheduler(
    "plan-lifecycle-hourly",
    {
      pattern: "20 * * * *",
      tz: "UTC",
    },
    {
      opts: {
        ...DEFAULT_QUEUE_OPTIONS,
      },
    },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "[PlanLifecycleJob]: Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, "[PlanLifecycleJob]: Job failed");
  });

  initialized = true;
}
