import { msg } from '@lingui/core/macro';

export const jobRunMessages = {
  jobMark: (id: string, status: string) => msg`Job ${id}: ${status}`,
  startedAt: (time: string) => msg`Started ${time}`,
  finishedAt: (time: string) => msg`Finished ${time}`,
  durationOf: (duration: string) => msg`Duration: ${duration}`,
};
