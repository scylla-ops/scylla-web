import { msg, plural } from '@lingui/core/macro';

/** The pipelines of a project, on its card of the projects page. */
export const projectCardMessages = {
  failing: (count: number) => msg`${count} failing`,
  runningFor: (duration: string) => msg`for ${duration}`,
  nextAt: (time: string) => msg`next ${time}`,
  morePipelines: (count: number) =>
    msg`${plural(count, { one: '# other pipeline', other: '# other pipelines' })}`,
  noPipeline: msg`No pipeline yet`,
  createPipeline: msg`Create a pipeline`,
  lastJob: (ago: string) => msg`Last job ${ago}`,
  jobRunningFor: (duration: string) => msg`Job running for ${duration}`,
  nextJob: (time: string) => msg`Next job ${time}`,
  noJob: msg`No job yet`,
  openJobs: (name: string) => msg`Open the jobs of ${name}`,
};
