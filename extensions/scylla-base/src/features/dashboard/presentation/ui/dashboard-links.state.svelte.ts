import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import PlusIcon from '@lucide/svelte/icons/plus';
import { activeWorkspaceSlug, contextStore, workspaceUrl } from '@platform/context';
import { createQuery, type SecondSidebarLink } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
import { dashboardLayoutQueries } from '@base/features/dashboard/presentation/dashboard-layout.queries.ts';
import { dashboardPath, NEW_DASHBOARD_PATH } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
import { DEFAULT_DASHBOARD_ID } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';

/** The id of the `nav.group` of `dashboard.module.ts`: the rail item of the dashboards. */
const DASHBOARDS_ITEM = 'dashboard';

/** The dashboards after the default one, then "New dashboard". It reads only while they show. */
export const dashboardLinks = (
  shown: () => string | undefined,
): (() => readonly SecondSidebarLink[]) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const open = $derived(shown() === DASHBOARDS_ITEM);

  const dashboards = createQuery(() => ({
    ...dashboardLayoutQueries.list(workspaceId),
    enabled: open && !!workspaceId,
  }));

  const links = $derived.by((): SecondSidebarLink[] => {
    const slug = activeWorkspaceSlug();
    if (!open || !slug) return [];
    const others = (dashboards.data ?? [])
      .filter(dashboard => dashboard.id !== DEFAULT_DASHBOARD_ID)
      .map(dashboard => ({
        title: dashboard.name ?? '',
        href: workspaceUrl(slug, dashboardPath(dashboard.id)),
        icon: LayoutDashboardIcon,
        apart: false,
      }));
    return [
      ...others,
      {
        title: t(dashboardMessages.newDashboard),
        href: workspaceUrl(slug, NEW_DASHBOARD_PATH),
        icon: PlusIcon,
        apart: true,
      },
    ];
  });

  return () => links;
};
