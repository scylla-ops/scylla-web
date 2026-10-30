import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { JobServiceClient } from '@base/generated/scylla/job/v1/job.client.ts';
import { DefaultJobsRepository } from './infrastructure/default-jobs.repository.ts';

const jobsRepository = new DefaultJobsRepository(
  new JobServiceClient(grpcTransport.getTransport()),
);

export const JobsModule = {
  id: 'jobs',
  domain: {
    jobsRepository,
  },
  routes: {
    project: [
      {
        // Under the jobs list of `pipeline`, whose crumb shows first.
        path: 'pipelines/:pipelineId/jobs/:jobId',
        permission: Permission.READ_JOB,
        breadcrumb: ({ jobId }) => ({ label: msg`Job`, highlight: jobId }),
        page: () => import('./presentation/ui/JobDetails/JobDetails.page.svelte'),
      },
    ],
  },
} satisfies ScyllaModule;
