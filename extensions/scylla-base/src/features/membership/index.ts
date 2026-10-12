/** The pages are not exported: the module loads them lazily. */
export {
  type ScopeMember,
  type MemberRole,
  MemberRoleOrigin,
  buildOrganizationMembers,
  buildProjectMembers,
} from './domain/structs/scope-member.struct.ts';
export {
  membershipPoints,
  type AddMemberAction,
  type OrganizationMembersContext,
  type ProjectMembersContext,
} from './presentation/membership.points.ts';
