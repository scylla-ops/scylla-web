/**
 * The local keys of the account. The sign-out removes them, so the next person on this browser
 * finds no workspace, history or state of the last one. The server keeps the state of the person:
 * the next sign-in reads it again. The theme, the language and the width of the sidebar are
 * choices for the device: they stay.
 */
const ACCOUNT_KEYS: readonly string[] = [
  // features/login: the id of the user of the session.
  'userId',
  // platform/context: the workspace, the project and the pipeline.
  'scylla-workspace-context',
  // features/pipeline: the style of the nodes.
  'scylla.blueprint.node-appearance',
];

/** The keys that start with one of these prefixes: one key for each user, workspace or release. */
const ACCOUNT_PREFIXES: readonly string[] = [
  // platform/user-state: the bookkeeping of the sync.
  'scylla-user-state:',
  // features/onboarding: the status of the tour.
  'onboarding:',
  // features/dashboard: the default dashboard, the last visit and the layouts of an older build.
  'dashboards:',
  'dashboards-default:',
  'dashboards-visit:',
  // shell: the last picks of the command bar, and the seen flags of the release.
  'scylla-command-bar-recent:',
  'whats-new-seen:',
];

const isAccountKey = (key: string): boolean =>
  ACCOUNT_KEYS.includes(key) || ACCOUNT_PREFIXES.some(prefix => key.startsWith(prefix));

type AccountStorage = Pick<Storage, 'length' | 'key' | 'removeItem'>;

/** Removes the local keys of the account. A private window can refuse it: then nothing changes. */
export const forgetAccountStorage = (storage: () => AccountStorage = () => localStorage): void => {
  try {
    const store = storage();
    const keys = Array.from({ length: store.length }, (_, index) => store.key(index));
    for (const key of keys) {
      if (key !== null && isAccountKey(key)) store.removeItem(key);
    }
  } catch {
    // The full load of the login page drops the state in memory all the same.
  }
};
