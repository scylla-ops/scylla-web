import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import WorkflowIcon from '@lucide/svelte/icons/workflow';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { ProjectServiceClient } from '@base/generated/scylla/project/v1/project.client.ts';
import { DefaultProjectRepository } from './infrastructure/default-project.repository.ts';

const projectRepository = new DefaultProjectRepository(
  new ProjectServiceClient(grpcTransport.getTransport()),
);

export const ProjectModule = {
  id: 'project',
  domain: {
    projectRepository: projectRepository,
  },
  routes: {
    organization: [
      {
        path: 'projects',
        // Reading the organization is the real gate.
        permission: Permission.READ_ORGANIZATION,
        breadcrumb: () => ({ label: msg`Projects` }),
        page: () => import('./presentation/ui/Project.page.svelte'),
        nav: { section: 'organization', title: msg`Projects`, icon: WorkflowIcon, order: 20 },
      },
    ],
  },
} satisfies ScyllaModule;
