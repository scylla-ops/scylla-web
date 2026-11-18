import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';

let period = $state.raw<DashboardPeriodState | null>(null);
let projectId = $state<string | null>(null);

/**
 * What the page and the panel of the second sidebar share: the period of the page, and the
 * project that the widgets show. The page attaches its period while it is open.
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
  /** Returns the detach. */
  attach: (state: DashboardPeriodState): (() => void) => {
    period = state;
    return () => {
      if (period === state) period = null;
    };
  },
};
