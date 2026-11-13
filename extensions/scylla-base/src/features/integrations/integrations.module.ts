import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import PlugIcon from '@lucide/svelte/icons/plug';
import SettingsIcon from '@lucide/svelte/icons/settings';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { MergeBlockServiceClient } from '@base/generated/scylla/integrations/v1/merge_block_service.client.ts';
import { RepositoryServiceClient } from '@base/generated/scylla/integrations/v1/repository_service.client.ts';
import { VcsConnectionServiceClient } from '@base/generated/scylla/integrations/v1/vcs_connection_service.client.ts';
import { VcsReportServiceClient } from '@base/generated/scylla/integrations/v1/vcs_report_service.client.ts';
import { PipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import { DefaultMergeBlockRepository } from './infrastructure/default-merge-block.repository.ts';
import { DefaultPipelineSourceRepository } from './infrastructure/default-pipeline-source.repository.ts';
import { DefaultRepositoryLinkRepository } from './infrastructure/default-repository-link.repository.ts';
import { DefaultVcsConnectionRepository } from './infrastructure/default-vcs-connection.repository.ts';
import { DefaultVcsReportRepository } from './infrastructure/default-vcs-report.repository.ts';

const transport = grpcTransport.getTransport();

/** The connections of a workspace to GitHub and GitLab, and the links of its projects. */
export const IntegrationsModule = {
  id: 'integrations',
  domain: {
    vcsConnectionRepository: new DefaultVcsConnectionRepository(
      new VcsConnectionServiceClient(transport),
    ),
    repositoryLinkRepository: new DefaultRepositoryLinkRepository(
      new RepositoryServiceClient(transport),
    ),
    mergeBlockRepository: new DefaultMergeBlockRepository(new MergeBlockServiceClient(transport)),
    vcsReportRepository: new DefaultVcsReportRepository(new VcsReportServiceClient(transport)),
    // The pipeline files and the source of a project: two RPCs of the pipelines, read here
    // because `pipeline` imports this module.
    pipelineSourceRepository: new DefaultPipelineSourceRepository(
      new PipelineServiceClient(transport),
    ),
  },
  routes: {
    workspace: [
      {
        path: 'settings/integrations',
        permission: Permission.VIEW_INTEGRATIONS,
        breadcrumb: () => ({ label: msg`Integrations` }),
        page: () => import('./presentation/ui/Integrations/Integrations.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Integrations`,
          keywords: msg`github gitlab git repository connection`,
          icon: PlugIcon,
          order: 61,
          group: { id: 'settings', title: msg`Settings`, icon: SettingsIcon },
        },
      },
    ],
    // The settings of a project: the repository is the only part today.
    project: [
      {
        path: 'settings/repository',
        permission: Permission.READ_REPOSITORY_LINK,
        breadcrumb: () => ({ label: msg`Settings` }),
        page: () => import('./presentation/ui/Repository/Repository.page.svelte'),
        nav: {
          section: 'project',
          title: msg`Settings`,
          keywords: msg`repository github gitlab git webhook reports`,
          icon: SettingsIcon,
          order: 90,
        },
      },
    ],
    // The Setup URL of the GitHub App: GitHub sends the browser back here, out of any workspace.
    personal: [
      {
        path: 'integrations/github/callback',
        page: () => import('./presentation/ui/GitHubCallback/GitHubCallback.page.svelte'),
      },
    ],
  },
} satisfies ScyllaModule;
