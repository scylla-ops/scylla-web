import type { ScyllaModule } from '@scylla/core-sdk';
import { RequirePermission, authorizationReady, can } from '@platform/authz';
import WorkspaceSelector from './presentation/layout/ui/context-selector/WorkspaceSelector/WorkspaceSelector.svelte';
import LaunchOverlays from './presentation/layout/ui/LaunchOverlays/LaunchOverlays.svelte';
import { layoutMessages } from './presentation/layout/messages/layout.messages.ts';
import NavUser from './presentation/layout/ui/NavUser/NavUser.svelte';
import NewBadge from './presentation/layout/ui/NewBadge.svelte';
import { markNavSeen } from './presentation/layout/whats-new.state.svelte.ts';
import { reportQueryError } from './presentation/report-query-error.ts';
import { retryQueryError } from './presentation/retry-query-error.ts';
import AppLayout from './presentation/router/AppLayout.svelte';
import ContextCleanerWrapper from './presentation/router/ContextCleaner.wrapper.svelte';
import LoginRedirect from './presentation/router/LoginRedirect.svelte';
import WorkspaceSyncWrapper from './presentation/router/WorkspaceSync.wrapper.svelte';
import PersonalLayout from './presentation/router/PersonalLayout/PersonalLayout.svelte';
import { breadcrumbParams, linkParams } from './presentation/shell-params.ts';

/**
 * The frame around the Scylla pages: the mounts that the feature modules graft
 * their routes on, the sidebar sections their links go in, the access policy,
 * and the shell parts. Add a page in its feature's `*.module.ts`, not here.
 */
export const ShellModule = {
  id: 'shell',
  domain: {},
  mounts: {
    public: {},
    app: { layout: AppLayout, shell: true },
    // Signed in, but outside any workspace: a user who has none reaches these pages too.
    personal: { layout: PersonalLayout },
    workspace: {
      parent: 'app',
      path: ':workspaceSlug',
      wrapper: WorkspaceSyncWrapper,
      breadcrumb: ({ workspaceName }) => ({ label: workspaceName ?? layoutMessages.workspace }),
    },
    // Members and roles of the workspace.
    access: {
      parent: 'workspace',
      path: 'access',
      breadcrumb: () => ({ label: layoutMessages.access }),
    },
    // The pages of the whole server: they do not belong to the active workspace.
    instance: {
      parent: 'workspace',
      path: 'instance',
      rootCrumb: true,
      breadcrumb: () => ({ label: layoutMessages.instance }),
    },
    project: {
      parent: 'workspace',
      path: 'projects/:projectId',
      wrapper: ContextCleanerWrapper,
      breadcrumb: ({ projectName }) => ({ label: projectName ?? layoutMessages.project }),
    },
  },
  routes: {
    // The pages the shell owns, which send the user on to a module's page.
    app: [{ page: () => import('./presentation/router/WorkspaceRedirect.wrapper.svelte') }],
    workspace: [{ redirect: 'dashboard' }],
    access: [{ redirect: 'members' }],
    instance: [{ redirect: 'users' }],
  },
  navSections: [
    { id: 'workspace', title: layoutMessages.workspace, header: WorkspaceSelector },
    { id: 'instance', title: layoutMessages.instanceAdmins },
  ],
  access: { can: permission => can(permission), ready: authorizationReady, guard: RequirePermission },
  shell: {
    sidebarFooter: [NavUser],
    overlays: [LaunchOverlays],
    navBadge: NewBadge,
    onNavOpen: markNavSeen,
    breadcrumbParams,
    linkParams,
  },
  onQueryError: reportQueryError,
  onQueryRetry: retryQueryError,
  fallback: LoginRedirect,
} satisfies ScyllaModule;
