import { msg, plural } from '@lingui/core/macro';

/**
 * Keep the msgids (placeholder names included) or the French is lost. Permission
 * and scope names are in `utils/permission-mapping.ts`.
 */
export const rolesMessages = {
  role: msg`Role`,
  roles: msg`Roles`,
  createRole: msg`Create role`,
  noRoles: msg`No roles yet. Create one to get started.`,
  selectARole: msg`Select a role to see its permissions and members.`,
  noDescription: msg`No description`,
  memberCount: (memberCount: number) =>
    msg`${plural(memberCount, { one: '# member', other: '# members' })}`,
  platformRoles: msg`Platform roles`,
  organizationRoles: (organization: string) => msg`${organization} roles`,
  organizationRolesCaption: (organization: string) =>
    msg`Created by the administrators of ${organization}. Only ${organization} sees and grants them.`,
  platformRolesCaption: msg`Shipped with Scylla or made by a system administrator. You can grant them, not edit them.`,
  noOrganizationRoles: (organization: string) =>
    msg`${organization} has no role of its own yet. Create one to grant your own set of permissions.`,
  platform: msg`Platform`,
  readOnly: msg`Read only`,
  appsOnly: msg`Apps only`,
  forPeople: msg`For people`,

  builtin: msg`Built-in`,
  custom: msg`Custom`,
  unknownOrigin: msg({ context: 'feminine', message: 'Unknown' }),
  edit: msg`Edit`,
  editDenied: msg`You don't have permission to edit roles.`,
  fullControl: msg`Full control`,

  permissions: msg`Permissions`,
  grantsFullControl: msg`Grants full control over its scope.`,
  noPermissions: msg`No permissions.`,
  unknownAccess: msg`Unknown access.`,

  grants: msg`Grants`,
  noGrants: msg`No one holds this role yet.`,
  remove: msg`Remove`,
  revokeDenied: msg`You don't have permission to revoke grants.`,

  addGrant: msg`Add grant`,
  grantDenied: msg`You don't have permission to grant this role.`,
  appsOnlyGrant: msg`This role is for apps. People cannot hold it.`,
  grantTitle: (roleName: string) => msg`Grant “${String(roleName)}”`,
  grantSubtitle: msg`Choose who receives this role and where it applies.`,
  systemWide: msg`This role grants access across the whole system.`,
  user: msg`User`,
  selectAUser: msg`Select a user`,
  pickAnOrganizationFirst: msg`Pick an organization first`,
  notAMember: msg`not a member of this organization`,
  cannotSeeProjects: msg`can't see this organization's projects`,
  organization: msg`Organization`,
  organizations: msg`Organizations`,
  pickAnOrganization: msg`Pick an organization`,
  noOrganizations: msg`No organizations available.`,
  projects: msg`Projects`,
  noProjects: msg`No projects in this organization.`,
  nobodyEligible: msg`Nobody can receive a project grant here yet. Admit someone to the organization first — from the organization switcher, under “Members” — and they will show up here.`,
  loading: msg`Loading…`,
  granted: msg`Granted`,
  selectedCount: (count: number) => msg`Selected (${Number(count)})`,
  cancel: msg`Cancel`,
  createGrant: msg`Create grant`,
  grantCreated: msg`Grant created`,
  grantsCreated: (count: number) => msg`${Number(count)} grants created`,
  grantFailed: msg`Failed to create grant`,

  editRoleTitle: msg`Edit role`,
  name: msg`Name`,
  namePlaceholder: msg`e.g., project-viewer`,
  description: msg`Description`,
  descriptionPlaceholder: msg`What is this role for?`,
  scope: msg`Scope`,
  scopeIsFixed: msg`Scope cannot be changed after creation.`,
  organizationRoleSubtitle: (organization: string) =>
    msg`Only ${organization} sees this role. You put in it only the permissions you hold in ${organization}.`,
  platformRoleSubtitle: msg`Every organization sees this role. You put in it only the permissions you hold at the system scope.`,
  whoHoldsIt: msg`Who holds it`,
  people: msg`People`,
  apps: msg`Apps`,
  organizationPeopleHint: (organization: string) =>
    msg`Members of ${organization}. Apps cannot hold it.`,
  organizationAppsHint: (organization: string) =>
    msg`Apps of ${organization}, such as agents. People cannot hold it.`,
  platformPeopleHint: msg`People. Apps cannot hold it.`,
  platformAppsHint: msg`Apps, such as agents. People cannot hold it.`,
  kindIsFixed: msg`Who holds a role cannot be changed after creation.`,
  notHeldIn: (organization: string) => msg`Not held in ${organization}`,
  notHeldAtSystem: msg`Not held at the system scope`,
  fullControlNotHeld: msg`You do not hold full control here, so you cannot give it.`,
  access: msg`Access`,
  restricted: msg`Restricted permissions`,
  saveChanges: msg`Save changes`,

  conferredCount: (conferredCount: number) =>
    msg`${plural(conferredCount, { one: '# selected', other: '# selected' })}`,
  always: msg`Always`,
  showSubPermissions: (label: string) => msg`Show ${label} sub-permissions`,
  hideSubPermissions: (label: string) => msg`Hide ${label} sub-permissions`,
  alwaysGrantedNote: msg`Holding a role in an organization is what belonging to it means, so every organization role carries it. An organization role applies to every project of the organization.`,
  preservedNote: (preservedCount: number) =>
    msg`${plural(preservedCount, {
      one: 'This role also holds # permission not managed here. It is kept unchanged.',
      other: 'This role also holds # permissions not managed here. They are kept unchanged.',
    })}`,
};
