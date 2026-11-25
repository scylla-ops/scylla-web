import { routeParams } from '@scylla/core-sdk';
import { currentSearch } from '@platform/context';
import type { DashboardLayout } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { dashboardLink } from '@base/features/dashboard/presentation/presenters/dashboard-paths.presenter.ts';
import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
import type { WidgetKind } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

let period = $state.raw<DashboardPeriodState | null>(null);
let shown = $state.raw<(() => DashboardLayout | undefined) | null>(null);
let projectId = $state<string | null>(null);
let adding = $state.raw<{ kind: WidgetKind } | null>(null);
let creating = $state(false);

/**
 * What the page, the panel of the second sidebar and the share button of the top bar share: the
 * period of the page, the dashboard that it shows, the project that the widgets show, and the
 * dialogs that the panel opens.
 */
export const dashboardView = {
  get period() {
    return period;
  },
  /** `null`: every project of the workspace. */
  get projectId() {
    return projectId;
  },
  setProject: (id: string | null) => {
    projectId = id;
  },
  /** The dialog "Add a widget", open on a kind. */
  get adding() {
    return adding;
  },
  openAdd: (kind: WidgetKind) => {
    adding = { kind };
  },
  closeAdd: () => {
    adding = null;
  },
  /** The dialog "New dashboard". */
  get creating() {
    return creating;
  },
  setCreating: (open: boolean) => {
    creating = open;
  },
  /** Returns the detach. */
  attach: (state: DashboardPeriodState): (() => void) => {
    period = state;
    return () => {
      if (period === state) period = null;
    };
  },
  /** The dashboard of the page, as a getter. Returns the detach. */
  show: (dashboard: () => DashboardLayout | undefined): (() => void) => {
    shown = dashboard;
    return () => {
      if (shown === dashboard) shown = null;
    };
  },
  /**
   * The link of the dashboard on the page, with its period, for the share button. `null` while
   * only its owner can open it: a private dashboard, or one that the server does not have.
   */
  get shareUrl(): string | null {
    const dashboard = shown?.();
    const { workspaceSlug } = routeParams();
    if (!dashboard || !workspaceSlug) return null;
    if (dashboard.version === undefined || dashboard.visibility !== 'workspace') return null;
    return dashboardLink(window.location.origin, workspaceSlug, dashboard.id, currentSearch());
  },
};
