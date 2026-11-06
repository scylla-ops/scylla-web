import type { ScyllaModule } from '@scylla/core-sdk';
import { RequirePermission, authorizationReady, can } from '@platform/authz';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import WorkspaceSelector from './presentation/layout/ui/context-selector/WorkspaceSelector/WorkspaceSelector.svelte';
import LaunchOverlays from './presentation/layout/ui/LaunchOverlays/LaunchOverlays.svelte';
import { languageCommands } from './presentation/layout/language.commands.ts';
import { layoutMessages } from './presentation/layout/messages/layout.messages.ts';
import NavUser from './presentation/layout/ui/NavUser/NavUser.svelte';
import NewBadge from './presentation/layout/ui/NewBadge.svelte';
import GlobalSearch from './presentation/layout/ui/GlobalSearch/GlobalSearch.svelte';
import NotificationsMenu from './presentation/layout/ui/NotificationsMenu/NotificationsMenu.svelte';
import ShellBrand from './presentation/layout/ui/ShellBrand/ShellBrand.svelte';
import { markNavSeen } from './presentation/layout/whats-new.state.svelte.ts';
import { reportQueryError } from './presentation/report-query-error.ts';
import { retryQueryError } from './presentation/retry-query-error.ts';
import AppLayout from './presentation/router/AppLayout.svelte';
import ContextCleanerWrapper from './presentation/router/ContextCleaner.wrapper.svelte';
import NotFoundPage from './presentation/router/NotFound/NotFound.page.svelte';
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
    { id: 'workspace', title: layoutMessages.workspace },
    {
      id: 'project',
      title: layoutMessages.project,
      within: { railItem: 'projects', titleParam: 'projectName' },
    },
    { id: 'instance', title: layoutMessages.instance, railItem: { icon: ShieldCheckIcon } },
    // The user menu opens it: the avatar of the rail is its item.
    { id: 'account', title: layoutMessages.account, noRailItem: true },
    // The user menu opens it too: the guided tours and the docs.
    { id: 'help', title: layoutMessages.help, noRailItem: true },
    // The bell opens it.
    { id: 'notifications', title: layoutMessages.notifications, noRailItem: true },
  ],
  access: {
    can: permission => can(permission),
    ready: authorizationReady,
    guard: RequirePermission,
  },
  shell: {
    brand: ShellBrand,
    topBarEnd: [GlobalSearch, NotificationsMenu, WorkspaceSelector],
    sidebarFooter: [NavUser],
    overlays: [LaunchOverlays],
    navBadge: NewBadge,
    onNavOpen: markNavSeen,
    breadcrumbParams,
    linkParams,
  },
  commands: languageCommands,
  onQueryError: reportQueryError,
  onQueryRetry: retryQueryError,
  fallback: NotFoundPage,
} satisfies ScyllaModule;
