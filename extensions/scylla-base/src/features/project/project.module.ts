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
      },
    ],
  },
} satisfies ScyllaModule;
