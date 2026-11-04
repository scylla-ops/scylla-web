import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { AccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import { WorkspaceServiceClient } from '@base/generated/scylla/workspaces/v1/workspace_service.client.ts';
import { DefaultWorkspaceRepository } from './infrastructure/default-workspace.repository.ts';

const transport = grpcTransport.getTransport();
const workspaceRepository = new DefaultWorkspaceRepository(
  new WorkspaceServiceClient(transport),
  new AccessServiceClient(transport),
);

/** No page: the workspace switcher of the shell and the other features read its queries. */
export const WorkspaceModule = {
  id: 'workspace',
  domain: {
    workspaceRepository: workspaceRepository,
  },
} satisfies ScyllaModule;
