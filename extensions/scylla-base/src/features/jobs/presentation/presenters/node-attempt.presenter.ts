import type { JobNodeExecution } from '@base/features/jobs/domain/entities/job.entity.ts';

export const attemptOf = (
  node: JobNodeExecution,
): { attempt: number; maxAttempts: number } | null =>
  node.maxAttempts > 1 && node.attempts > 0
    ? { attempt: node.attempts, maxAttempts: node.maxAttempts }
    : null;
