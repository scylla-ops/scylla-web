import type { ScyllaModule } from '@scylla/core-sdk';
import { RequirePermission, authorizationReady, can } from '@platform/authz';
import OrganizationSelector from './presentation/layout/ui/context-selector/OrganizationSelector/OrganizationSelector.svelte';
import { layoutMessages } from './presentation/layout/ui/layout.messages.ts';
import NavUser from './presentation/layout/ui/NavUser/NavUser.svelte';
import NewBadge from './presentation/layout/ui/NewBadge.svelte';
import WhatsNewDialog from './presentation/layout/ui/WhatsNewDialog/WhatsNewDialog.svelte';
import { markNavSeen } from './presentation/layout/whats-new.svelte.ts';
import { reportQueryError } from './presentation/report-query-error.ts';
import AppLayout from './presentation/router/AppLayout.svelte';
import ContextCleanerWrapper from './presentation/router/ContextCleaner.wrapper.svelte';
import LoginRedirect from './presentation/router/LoginRedirect.svelte';
import OrganizationSyncWrapper from './presentation/router/OrganizationSync.wrapper.svelte';
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
    organization: { parent: 'app', path: ':organizationSlug', wrapper: OrganizationSyncWrapper },
    project: {
      parent: 'organization',
      path: 'projects/:projectId',
      wrapper: ContextCleanerWrapper,
      breadcrumb: ({ projectName }) => ({ label: layoutMessages.project, highlight: projectName }),
    },
  },
  routes: {
    // The pages the shell owns, which send the user on to a module's page.
    app: [{ page: () => import('./presentation/router/OrganizationRedirect.wrapper.svelte') }],
    organization: [{ redirect: 'dashboard' }],
  },
  navSections: [
    { id: 'organization', title: layoutMessages.organization, header: OrganizationSelector },
    { id: 'system', title: layoutMessages.system },
  ],
  access: { can: permission => can(permission), ready: authorizationReady, guard: RequirePermission },
  shell: {
    sidebarFooter: [NavUser],
    overlays: [WhatsNewDialog],
    navBadge: NewBadge,
    onNavOpen: markNavSeen,
    breadcrumbParams,
    linkParams,
  },
  onQueryError: reportQueryError,
  fallback: LoginRedirect,
} satisfies ScyllaModule;
