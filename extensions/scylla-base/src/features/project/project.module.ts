import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import WorkflowIcon from '@lucide/svelte/icons/workflow';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { ProjectServiceClient } from '@base/generated/scylla/projects/v1/project_service.client.ts';
import { DefaultProjectRepository } from './infrastructure/default-project.repository.ts';
import { projectCommands } from './presentation/project.commands.ts';

const transport = grpcTransport.getTransport();
const projectRepository = new DefaultProjectRepository(new ProjectServiceClient(transport));

export const ProjectModule = {
  id: 'project',
  domain: {
    projectRepository: projectRepository,
  },
  commands: projectCommands,
  routes: {
    workspace: [
      {
        path: 'projects',
        // Reading the workspace is the real gate.
        permission: Permission.READ_WORKSPACE,
        breadcrumb: () => ({ label: msg`Projects` }),
        page: () => import('./presentation/ui/Project.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`All projects`,
          icon: WorkflowIcon,
          order: 20,
          group: { id: 'projects', title: msg`Projects`, icon: WorkflowIcon },
        },
        children: [
          {
            path: 'new',
            permission: Permission.CREATE_PROJECT,
            breadcrumb: () => ({ label: msg`New project` }),
            page: () => import('./presentation/ui/NewProject/NewProject.page.svelte'),
          },
          // The way "linked to GitHub" is `projects/new/github`, in `integrations`.
          {
            path: 'new/regular',
            permission: Permission.CREATE_PROJECT,
            page: () => import('./presentation/ui/NewRegularProject/NewRegularProject.page.svelte'),
          },
        ],
      },
    ],
  },
} satisfies ScyllaModule;
