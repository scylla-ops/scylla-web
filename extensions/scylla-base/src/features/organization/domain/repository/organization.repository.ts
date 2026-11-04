import type { UserSummary } from '@base/features/user';
import type {
  OrganizationEntity,
  WorkspaceOwner,
} from '@base/features/organization/domain/entities/organization.entity.ts';

export interface OrganizationRepository {
  /** The workspaces where the user of the session has a role, or that it owns. */
  getMine(): Promise<OrganizationEntity[]>;
  /** The actors with a role on the workspace, and its owners. */
  listMembers(organizationId: string): Promise<UserSummary[]>;
  /** An absent slug: the server makes one from the name. */
  create: (name: string, slug?: string) => Promise<OrganizationEntity>;
  /** An absent field stays unchanged. */
  update: (organizationId: string, name?: string, slug?: string) => Promise<OrganizationEntity>;
  /** FAILED_PRECONDITION with WORKSPACE_NOT_EMPTY while it holds projects or agents. */
  delete: (organizationId: string) => Promise<void>;
  listOwners: (organizationId: string) => Promise<WorkspaceOwner[]>;
  addOwner: (organizationId: string, userId: string) => Promise<void>;
  /** FAILED_PRECONDITION with LAST_OWNER for the last owner. */
  removeOwner: (organizationId: string, userId: string) => Promise<void>;
}
