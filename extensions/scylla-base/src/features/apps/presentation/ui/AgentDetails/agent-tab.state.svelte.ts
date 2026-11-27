import { createSearchParams } from '@platform/context';

/** The tabs of the agent page, the most useful first. The first one is the default. */
export const AGENT_TABS = ['overview', 'jobs', 'activity', 'settings', 'machine'] as const;
export type AgentTab = (typeof AGENT_TABS)[number];

/**
 * The open tab of the agent page. It is in the URL (`?tab=jobs`), so that a link, a reload and the
 * back button open it again. The default tab writes nothing. A tab that the user may not see gives
 * the default tab.
 */
export const createAgentTab = (shown: () => readonly AgentTab[]) => {
  const search = createSearchParams(['tab']);
  const current = $derived<AgentTab>(
    shown().find(tab => tab === search.values.tab) ?? AGENT_TABS[0],
  );

  return {
    get current() {
      return current;
    },
    select(next: string) {
      const tab = AGENT_TABS.find(known => known === next);
      if (tab) search.write({ tab: tab === AGENT_TABS[0] ? '' : tab });
    },
  };
};

export type AgentTabState = ReturnType<typeof createAgentTab>;
