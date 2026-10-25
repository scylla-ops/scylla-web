import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import { Permission, PermissionScope } from '@platform/authz';
import { getPermissionDefinition } from '@base/features/roles/domain/structs/permission-catalog.struct.ts';

interface PermissionLabel {
  label: MessageDescriptor;
  /** Used when the role's scope is broader than this permission's: "every project", not "the project". */
  broadLabel?: MessageDescriptor;
}

/** The words of each permission of the catalog. */
const PERMISSION_LABELS: Partial<Record<Permission, PermissionLabel>> = {
  [Permission.LIST_USERS]: { label: msg`View users` },
  [Permission.CREATE_USER]: { label: msg`Create users` },
  [Permission.DELETE_USER]: { label: msg`Delete users` },
  [Permission.CREATE_ORGANIZATION]: { label: msg`Create organizations` },
  [Permission.MANAGE_ROLES]: { label: msg`Manage roles, and grant them anywhere` },
  [Permission.MANAGE_SYSTEM_GRANTS]: { label: msg`Grant and revoke roles anywhere` },
  [Permission.READ_ORGANIZATION]: {
    label: msg`Member of the organization`,
    broadLabel: msg`See every organization on the instance`,
  },
  [Permission.UPDATE_ORGANIZATION]: {
    label: msg`Edit the organization`,
    broadLabel: msg`Edit every organization`,
  },
  [Permission.DELETE_ORGANIZATION]: {
    label: msg`Delete the organization`,
    broadLabel: msg`Delete every organization`,
  },
  [Permission.LIST_AGENTS]: { label: msg`View agents` },
  [Permission.CREATE_AGENT]: { label: msg`Create agents` },
  [Permission.READ_APP]: { label: msg`Open an agent` },
  [Permission.READ_APP_STATS]: { label: msg`View agent statistics` },
  [Permission.DELETE_APP]: { label: msg`Delete agents` },
  [Permission.LIST_PROJECTS_BY_ORGANIZATION]: {
    label: msg`See and open every project in the organization`,
    broadLabel: msg`See every project of every organization`,
  },
  [Permission.CREATE_PROJECT]: { label: msg`Create projects` },
  [Permission.LIST_ORGANIZATION_MEMBERS]: {
    label: msg`See who belongs to the organization`,
    broadLabel: msg`See who belongs to any organization`,
  },
  [Permission.MANAGE_ORG_GRANTS]: {
    label: msg`Grant and revoke roles in the organization`,
    broadLabel: msg`Grant and revoke roles in every organization`,
  },
  [Permission.MANAGE_ORG_ROLES]: {
    label: msg`Create, edit and delete the roles of the organization`,
    broadLabel: msg`Create, edit and delete the roles of every organization`,
  },
  [Permission.READ_PROJECT]: {
    label: msg`Member of the project`,
    broadLabel: msg`Open any project`,
  },
  [Permission.UPDATE_PROJECT]: {
    label: msg`Edit the project`,
    broadLabel: msg`Edit every project`,
  },
  [Permission.DELETE_PROJECT]: {
    label: msg`Delete the project`,
    broadLabel: msg`Delete every project`,
  },
  [Permission.LIST_PROJECT_MEMBERS]: {
    label: msg`See who works on the project`,
    broadLabel: msg`See who works on any project`,
  },
  [Permission.MANAGE_PROJECT_GRANTS]: {
    label: msg`Grant and revoke roles on the project`,
    broadLabel: msg`Grant and revoke roles on every project`,
  },
  [Permission.LIST_PIPELINES_BY_PROJECT]: {
    label: msg`View the pipeline list`,
    broadLabel: msg`View the pipelines of every project`,
  },
  [Permission.READ_PIPELINE]: { label: msg`Open a pipeline`, broadLabel: msg`Open any pipeline` },
  [Permission.CREATE_PIPELINE]: { label: msg`Create pipelines` },
  [Permission.UPDATE_PIPELINE]: { label: msg`Edit pipelines` },
  [Permission.DELETE_PIPELINE]: { label: msg`Delete pipelines` },
  [Permission.RUN_PIPELINE]: { label: msg`Run pipelines` },
  [Permission.MANAGE_TRIGGERS]: { label: msg`Manage triggers` },
  [Permission.LIST_JOBS_BY_PIPELINE]: { label: msg`View pipeline jobs` },
  [Permission.READ_JOB_LOGS]: { label: msg`Read job logs` },
  [Permission.DELETE_JOB]: { label: msg`Delete jobs` },
  [Permission.LIST_SECRETS]: {
    label: msg`View project secrets`,
    broadLabel: msg`View the secrets of every project`,
  },
  [Permission.CREATE_SECRET]: { label: msg`Create secrets` },
  [Permission.DELETE_SECRET]: { label: msg`Delete secrets` },
};

export const SCOPE_LABELS: Record<PermissionScope, MessageDescriptor> = {
  [PermissionScope.SYSTEM]: msg`System`,
  [PermissionScope.ORGANIZATION]: msg`Organization`,
  [PermissionScope.PROJECT]: msg`Project`,
  [PermissionScope.UNSPECIFIED]: msg({ context: 'feminine', message: 'Unknown' }),
};

/** Through `t`: a label rendered in a template follows a locale switch. */
export const scopeLabelOf = (scope: PermissionScope): string => t(SCOPE_LABELS[scope]);

/**
 * Outside the catalog, falls back to the humanized enum key. `roleScope` is the
 * scope of the role carrying it: a broader scope gets the plural wording.
 */
export const permissionLabelOf = (permission: Permission, roleScope?: PermissionScope): string => {
  const definition = getPermissionDefinition(permission);
  const words = PERMISSION_LABELS[permission];
  if (!definition || !words) return humanizePermission(permission);

  const broadened = roleScope !== undefined && roleScope !== definition.scope;
  return t(broadened ? (words.broadLabel ?? words.label) : words.label);
};

/** `LIST_JOBS_BY_PIPELINE` → "List jobs by pipeline". Untranslated. */
export const humanizePermission = (permission: Permission): string => {
  const key = Permission[permission] as string | undefined;
  if (!key) return `Permission #${permission}`;
  const words = key.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};
