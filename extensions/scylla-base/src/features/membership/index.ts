/** The pages are not exported: the module loads them lazily. */
export {
  type ScopeMember,
  type MemberRole,
  MemberRoleOrigin,
  buildWorkspaceMembers,
  buildProjectMembers,
} from './presentation/presenters/scope-members.presenter.ts';
export {
  membershipPoints,
  type AddMemberAction,
  type WorkspaceMembersContext,
  type ProjectMembersContext,
} from './presentation/membership.points.ts';
