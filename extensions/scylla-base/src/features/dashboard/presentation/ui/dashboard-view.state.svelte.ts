import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
import type { WidgetKind } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

let period = $state.raw<DashboardPeriodState | null>(null);
let projectId = $state<string | null>(null);
let adding = $state.raw<{ kind: WidgetKind } | null>(null);
let creating = $state(false);

/**
 * What the page and the panel of the second sidebar share: the period of the page, the project
 * that the widgets show, and the dialogs that the panel opens.
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
};
