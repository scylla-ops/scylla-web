import type {
  JobEntity,
  JobNodeExecution,
} from '@base/features/jobs/domain/entities/job.entity.ts';

/** The node id of the log lines of the checkout. A node of a pipeline cannot start with a dot. */
export const CHECKOUT_STEP_ID = '.checkout';

export const isCheckoutStep = (stepId: string): boolean => stepId === CHECKOUT_STEP_ID;

/** The steps of the page: the built-in checkout first, when the job has one, then the nodes. */
export const stepsOf = (job: JobEntity): JobNodeExecution[] =>
  job.checkout
    ? [
        {
          id: CHECKOUT_STEP_ID,
          state: job.checkout.state,
          startedAt: job.checkout.startedAt,
          finishedAt: job.checkout.finishedAt,
          attempts: 0,
          maxAttempts: 1,
        },
        ...job.nodeExecutions,
      ]
    : job.nodeExecutions;
