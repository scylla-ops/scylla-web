import { point } from '@scylla/core-sdk';

/** What the components in the zones of the organization members page receive. */
export interface OrganizationMembersContext {
  organizationId: string;
  organizationName: string;
  /** `MANAGE_ORG_GRANTS` on this organization. */
  canManage: boolean;
  /** The people that the page lists. */
  memberCount: number;
  /** Reloads the members and their grants, after a change that a component made. */
  refreshMembers: () => void;
}

/** What the components in the zones of the project members page receive. */
export interface ProjectMembersContext {
  organizationId: string;
  projectId: string;
  /** `MANAGE_PROJECT_GRANTS` on this project. */
  canManage: boolean;
  /** The people that the page lists. */
  memberCount: number;
  /** Reloads the members and their grants, after a change that a component made. */
  refreshMembers: () => void;
}

/** The "Add a member" action of the organization page. It picks a person in the user directory. */
export interface AddMemberAction {
  /** Without `LIST_USERS`. `deny`: a denied button with the reason. `hide`: no button. */
  withoutDirectory: 'deny' | 'hide';
  /** `default`: the main action of the header. `outline`: another action is the main one. */
  variant: 'default' | 'outline';
}

/** Listed in `MembershipModule.points`: the loader names them `membership.<key>`. */
export const membershipPoints = {
  /** The header actions. Its own child is the "Add a member" button: `before`, `after` or `replace` it. */
  organizationActions: point.zone<OrganizationMembersContext>(),
  /** Under the members list. No default content. */
  organizationSection: point.zone<OrganizationMembersContext>(),
  /** How the "Add a member" button of the organization page shows. */
  organizationAddMember: point.value<AddMemberAction>(),
  /** The header actions. Its own child is the "Add a member" button: `before`, `after` or `replace` it. */
  projectActions: point.zone<ProjectMembersContext>(),
  /** Under the members list. No default content. */
  projectSection: point.zone<ProjectMembersContext>(),
};
