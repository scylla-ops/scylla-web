// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { Permission } from '@platform/authz';
import { namesFor, permissionsFrom } from '../permission-map.struct.ts';

/**
 * The permissions of the `authz!` definitions of the server (scylla-domain), for each kind. The
 * server refuses a name that the definition does not have: a typo here breaks every `can()`.
 */
const SERVER: Record<'platform' | 'workspace' | 'project', string[]> = {
  platform: [
    'list_users',
    'get_user',
    'create_user',
    'update_user',
    'set_user_status',
    'delete_user',
    'send_password_reset',
    'list_user_sessions',
    'revoke_user_sessions',
    'grant_instance_admin',
    'update_instance_settings',
    'revoke_instance_admin',
    'list_roles',
    'get_role',
    'create_role',
    'update_role',
    'delete_role',
    'grant',
    'revoke',
    'get_vcs_app',
    'start_git_hub_manifest',
    'complete_git_hub_manifest',
    'delete_vcs_app',
  ],
  workspace: [
    'add_app_key',
    'cancel_job',
    'create_app',
    'create_invitation',
    'create_join_code',
    'create_pipeline',
    'create_project',
    'create_secret',
    'create_trigger',
    'delete_app',
    'delete_job',
    'delete_pipeline',
    'delete_project',
    'delete_secret',
    'delete_trigger',
    'delete_workspace',
    'fire_trigger_now',
    'get_app',
    'get_job',
    'get_pipeline',
    'get_project',
    'get_trigger',
    'get_workspace',
    'grant',
    'create_role',
    'list_access',
    'list_agent_stats',
    'list_roles',
    'list_apps',
    'list_invitations',
    'list_pipeline_jobs',
    'list_pipeline_triggers',
    'list_project_pipelines',
    'list_projects',
    'list_secrets',
    'list_workspace_jobs',
    'list_workspace_pipelines',
    'list_workspaces',
    'manage_owners',

    'rerun_job',
    'resend_invitation',
    'revoke',
    'rename_app_key',
    'revoke_app_key',
    'revoke_invitation',
    'run_jobs',
    'run_pipeline',
    'set_trigger_enabled',
    'tail_job_logs',
    'update_pipeline',
    'update_project',
    'update_secret',
    'update_trigger',
    'update_workspace',
    'get_vcs_providers',
    'list_vcs_connections',
    'get_vcs_connection',
    'start_git_hub_install',
    'complete_git_hub_install',
    'connect_git_lab',
    'replace_git_lab_token',
    'delete_vcs_connection',
    'get_repository_link',
    'link_repository',
    'approve_job',
    'reject_job',
  ],
  project: [
    'cancel_job',
    'create_pipeline',
    'create_secret',
    'create_trigger',
    'delete_job',
    'delete_pipeline',
    'delete_project',
    'delete_secret',
    'delete_trigger',
    'fire_trigger_now',
    'get_job',
    'get_pipeline',
    'get_project',
    'get_trigger',
    'grant',
    'list_access',
    'list_pipeline_jobs',
    'list_pipeline_triggers',
    'list_project_pipelines',
    'list_projects',
    'list_secrets',
    'rerun_job',
    'revoke',
    'run_pipeline',
    'set_trigger_enabled',
    'tail_job_logs',
    'update_pipeline',
    'update_project',
    'update_secret',
    'update_trigger',
    'get_repository_link',
    'link_repository',
    'approve_job',
    'reject_job',
  ],
};

/** The server answers at most 50 names in one `CheckPermissions` call (`MAX_CHECKS`). */
const MAX_CHECKS = 50;

describe('the permission map', () => {
  it.each(['platform', 'workspace', 'project'] as const)(
    'asks the server only the names of the definition %s',
    kind => {
      expect(namesFor(kind).filter(name => !SERVER[kind].includes(name))).toEqual([]);
    },
  );

  it.each(['platform', 'workspace', 'project'] as const)(
    'asks the server at most 50 names on the definition %s',
    kind => {
      expect(namesFor(kind).length).toBeLessThanOrEqual(MAX_CHECKS);
    },
  );

  it('gives the repository and the approval on a project and on its workspace', () => {
    const allowed = new Set(['get_repository_link', 'link_repository', 'approve_job']);

    for (const kind of ['workspace', 'project'] as const) {
      expect(permissionsFrom(kind, allowed)).toEqual(
        expect.arrayContaining([
          Permission.READ_REPOSITORY_LINK,
          Permission.MANAGE_REPOSITORY_LINK,
          Permission.APPROVE_JOB,
        ]),
      );
    }
  });

  it('gives a workspace permission from its name, and nothing for another kind', () => {
    const allowed = new Set(['create_project']);

    expect(permissionsFrom('workspace', allowed)).toEqual([Permission.CREATE_PROJECT]);
    expect(permissionsFrom('project', allowed)).toEqual([]);
  });

  it('gives each permission that a shared name stands for', () => {
    expect(permissionsFrom('workspace', new Set(['create_app']))).toEqual(
      expect.arrayContaining([Permission.CREATE_APP, Permission.CREATE_AGENT]),
    );
  });
});
