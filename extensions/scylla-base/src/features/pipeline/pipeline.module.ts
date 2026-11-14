import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import WorkflowIcon from '@lucide/svelte/icons/workflow';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { PipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import { DefaultPipelineRepository } from './infrastructure/default-pipeline.repository.ts';
import { DefaultNodeTemplateRepository } from './infrastructure/default-node-template.repository.ts';
import { SavePipelineUseCase } from './domain/use-cases/save-pipeline.use-case.ts';
import { pipelineCommands } from './presentation/pipeline.commands.ts';
import './presentation/node-appearance.user-state.ts';

const pipelineRepository = new DefaultPipelineRepository(
  new PipelineServiceClient(grpcTransport.getTransport()),
);

export const PipelineModule = {
  id: 'pipeline',
  domain: {
    pipelineRepository: pipelineRepository,
    nodeTemplateRepository: new DefaultNodeTemplateRepository(),
    savePipeline: new SavePipelineUseCase(pipelineRepository),
  },
  commands: pipelineCommands,
  routes: {
    project: [
      {
        permission: Permission.LIST_PIPELINES_BY_PROJECT,
        page: () =>
          import('./presentation/ui/dashboard/DashboardPipeline/DashboardPipeline.page.svelte'),
        nav: { section: 'project', title: msg`Pipelines`, icon: WorkflowIcon, order: 10 },
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
        page: () => import('./presentation/ui/editor/PipelineUpdate/PipelineUpdate.page.svelte'),
      },
      {
        // A file pipeline: the editor page, read only. An editor pipeline redirects to `edit/:pipelineId`.
        path: 'pipelines/:pipelineId',
        permission: Permission.READ_PIPELINE,
        breadcrumb: ({ pipelineName }) => ({
          label: msg`Pipeline`,
          highlight: pipelineName,
        }),
        page: () => import('./presentation/ui/file/FilePipeline/FilePipeline.page.svelte'),
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
        page: () => import('./presentation/ui/PipelineJobs/PipelineJobs.page.svelte'),
      },
    ],
  },
} satisfies ScyllaModule;
