import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { PipelineServiceClient } from '@base/generated/scylla/pipeline/v1/pipeline.client.ts';
import { DefaultPipelineRepository } from './infrastructure/default-pipeline.repository.ts';
import { DefaultStepTemplateRepository } from './infrastructure/default-step-template.repository.ts';
import { SavePipelineUseCase } from './domain/use-cases/save-pipeline.use-case.ts';

const pipelineRepository = new DefaultPipelineRepository(
  new PipelineServiceClient(grpcTransport.getTransport()),
);

export const PipelineModule = {
  id: 'pipeline',
  domain: {
    pipelineRepository: pipelineRepository,
    stepTemplateRepository: new DefaultStepTemplateRepository(),
    savePipeline: new SavePipelineUseCase(pipelineRepository),
  },
  routes: {
    project: [
      {
        permission: Permission.LIST_PIPELINES_BY_PROJECT,
        page: () =>
          import('./presentation/ui/dashboard/DashboardPipeline/DashboardPipeline.page.svelte'),
      },
      {
        path: 'create',
        permission: Permission.CREATE_PIPELINE,
        breadcrumb: () => ({ label: msg`Create` }),
        page: () => import('./presentation/ui/editor/PipelineCreation.page.svelte'),
      },
      {
        path: 'edit/:pipelineId',
        permission: Permission.UPDATE_PIPELINE,
        breadcrumb: ({ pipelineName }) => ({
          label: msg`Pipeline`,
          highlight: pipelineName,
          detail: msg`Edit`,
        }),
        page: () => import('./presentation/ui/editor/PipelineUpdate.page.svelte'),
      },
      {
        // Here, not in `jobs`: the page has a Run action. The job page from `jobs` shows this crumb too.
        path: 'pipelines/:pipelineId/jobs',
        permission: Permission.LIST_JOBS_BY_PIPELINE,
        breadcrumb: ({ pipelineName }) => ({
          label: msg`Pipeline`,
          highlight: pipelineName,
          detail: msg`Jobs`,
        }),
        page: () => import('./presentation/ui/PipelineJobs.page.svelte'),
      },
    ],
  },
} satisfies ScyllaModule;
