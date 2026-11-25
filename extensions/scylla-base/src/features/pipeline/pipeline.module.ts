import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import LibraryBigIcon from '@lucide/svelte/icons/library-big';
import WorkflowIcon from '@lucide/svelte/icons/workflow';
import { Permission } from '@platform/authz';
import { grpcTransport, marketplaceIsLocal, marketplaceTransport, marketplaceUrl } from '@platform/grpc';
import { PipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import { FragmentServiceClient } from '@base/generated/scylla/library/v1/fragment_service.client.ts';
import { MarketplaceServiceClient } from '@base/generated/scylla/marketplace/v1/marketplace_service.client.ts';
import { fragmentCrumbName } from './presentation/fragment-crumb.state.svelte.ts';
import { DefaultPipelineRepository } from './infrastructure/default-pipeline.repository.ts';
import { DefaultNodeTemplateRepository } from './infrastructure/default-node-template.repository.ts';
import { DefaultFragmentRepository } from './infrastructure/default-fragment.repository.ts';
import { SavePipelineUseCase } from './domain/use-cases/save-pipeline.use-case.ts';
import { pipelineCommands } from './presentation/pipeline.commands.ts';
import { pipelinePoints } from './presentation/pipeline.points.ts';
import {
  fragmentLinks,
  fragmentSearch,
} from './presentation/ui/library/fragment-links.state.svelte.ts';
import './presentation/node-appearance.user-state.ts';

const pipelineClient = new PipelineServiceClient(grpcTransport.getTransport());
const pipelineRepository = new DefaultPipelineRepository(pipelineClient);
const fragmentRepository = new DefaultFragmentRepository(
  new FragmentServiceClient(grpcTransport.getTransport()),
  pipelineClient,
  {
    client: new MarketplaceServiceClient(marketplaceTransport.getTransport()),
    // At call time: the module loads in node too, with no window.
    get registry() {
      return marketplaceUrl() || window.location.origin;
    },
    local: marketplaceIsLocal(),
  },
);

export const PipelineModule = {
  id: 'pipeline',
  domain: {
    pipelineRepository: pipelineRepository,
    nodeTemplateRepository: new DefaultNodeTemplateRepository(),
    fragmentRepository,
    savePipeline: new SavePipelineUseCase(pipelineRepository, fragmentRepository),
  },
  commands: pipelineCommands,
  points: pipelinePoints,
  routes: {
    // The library of the workspace: the fragments that its pipelines share.
    workspace: [
      {
        path: 'library',
        permission: Permission.LIST_PIPELINES_BY_WORKSPACE,
        breadcrumb: () => ({ label: msg`Library` }),
        page: () => import('./presentation/ui/library/FragmentLibrary/FragmentLibrary.page.svelte'),
        nav: { section: 'workspace', title: msg`Library`, icon: LibraryBigIcon, order: 25 },
        children: [
          {
            path: ':fragmentId',
            permission: Permission.LIST_PIPELINES_BY_WORKSPACE,
            breadcrumb: () => ({ label: fragmentCrumbName() ?? msg`Fragment` }),
            page: () => import('./presentation/ui/library/FragmentDetail/FragmentDetail.page.svelte'),
            share: true,
          },
        ],
      },
    ],
    project: [
      {
        permission: Permission.LIST_PIPELINES_BY_PROJECT,
        page: () =>
          import('./presentation/ui/dashboard/DashboardPipeline/DashboardPipeline.page.svelte'),
        nav: { section: 'project', title: msg`Pipelines`, icon: WorkflowIcon, order: 10 },
        share: true,
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
        share: true,
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
        share: true,
      },
      {
        // Here, not in `jobs`: the page has a Run action. The job page from `jobs` shows this crumb too.
        // The crumb of `pipelines/:pipelineId` names the pipeline before it.
        path: 'pipelines/:pipelineId/jobs',
        permission: Permission.LIST_JOBS_BY_PIPELINE,
        breadcrumb: () => ({ label: msg`Jobs` }),
        page: () => import('./presentation/ui/PipelineJobs/PipelineJobs.page.svelte'),
        share: true,
      },
    ],
  },
  shell: {
    secondSidebarLinks: fragmentLinks,
    secondSidebarSearch: fragmentSearch,
  },
} satisfies ScyllaModule;
