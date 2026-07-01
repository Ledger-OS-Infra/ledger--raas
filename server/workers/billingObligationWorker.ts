import { Worker } from "bullmq";
import { generateDueObligations } from "../lib/billing/generateObligations";
import {
  BILLING_OBLIGATION_QUEUE,
  GENERATE_DUE_JOB,
  registerBillingCron,
} from "../queues/billingObligationGeneration";
import { getBullMqConnection } from "../redis/bullmqConnection";

let worker: Worker | null = null;

export async function startBillingObligationWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  worker = new Worker(
    BILLING_OBLIGATION_QUEUE,
    async (job) => {
      if (job.name === GENERATE_DUE_JOB) {
        const asOfDate = (job.data as { as_of_date?: string }).as_of_date;
        const summary = await generateDueObligations(asOfDate);
        return summary;
      }
      throw new Error(`Unknown billing job: ${job.name}`);
    },
    { connection: getBullMqConnection() },
  );

  worker.on("failed", (job, err) => {
    console.error(`Billing job ${job?.id} failed`, err);
  });

  worker.on("completed", (job) => {
    const result = job.returnvalue as { results?: unknown[] } | undefined;
    const count = result?.results?.length ?? 0;
    console.info(`Billing job ${job.id} completed (${count} obligation(s) processed)`);
  });

  await registerBillingCron();
  console.info("Billing obligation worker started (cron: daily 00:00 UTC)");

  return worker;
}

export async function stopBillingObligationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
