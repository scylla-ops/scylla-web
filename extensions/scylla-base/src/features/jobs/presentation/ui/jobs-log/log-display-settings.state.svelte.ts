/** The display settings of the log viewer of a job, in `localStorage` (tracker registry). */
export const LOG_DISPLAY_KEY = 'scylla.job-log.display';

export type LogTextSize = 's' | 'm' | 'l';
export const LOG_TEXT_SIZES: readonly LogTextSize[] = ['s', 'm', 'l'];

/** How the job page shows its nodes beside the log. */
export type NodeView = 'list' | 'graph';

export interface LogDisplaySettings {
  /** The colors of the escape codes. Off: plain text, the search and the errors still show. */
  ansi: boolean;
  wrap: boolean;
  timestamps: boolean;
  lineNumbers: boolean;
  size: LogTextSize;
  nodeView: NodeView;
}

export const DEFAULT_LOG_DISPLAY: LogDisplaySettings = {
  ansi: true,
  wrap: true,
  timestamps: false,
  lineNumbers: true,
  size: 'm',
  nodeView: 'list',
};

const BOOLEAN_KEYS = ['ansi', 'wrap', 'timestamps', 'lineNumbers'] as const;

/** The saved settings over the defaults. A value that this build cannot read keeps its default. */
export const decodeLogDisplay = (value: unknown): LogDisplaySettings => {
  const settings = { ...DEFAULT_LOG_DISPLAY };
  if (!value || typeof value !== 'object') return settings;

  const saved = value as Record<string, unknown>;
  for (const key of BOOLEAN_KEYS) {
    if (typeof saved[key] === 'boolean') settings[key] = saved[key];
  }
  if (LOG_TEXT_SIZES.includes(saved.size as LogTextSize)) settings.size = saved.size as LogTextSize;
  if (saved.nodeView === 'list' || saved.nodeView === 'graph') settings.nodeView = saved.nodeView;
  return settings;
};

export interface LogDisplay {
  readonly current: LogDisplaySettings;
  set: (change: Partial<LogDisplaySettings>) => void;
}

/** The settings of the viewer. A blocked storage only forgets them when the page is left. */
export const createLogDisplay = (
  storage: () => Storage | undefined = () => globalThis.localStorage,
): LogDisplay => {
  const read = (): LogDisplaySettings => {
    try {
      const stored = storage()?.getItem(LOG_DISPLAY_KEY);
      return decodeLogDisplay(stored ? JSON.parse(stored) : null);
    } catch {
      return { ...DEFAULT_LOG_DISPLAY };
    }
  };

  let current = $state<LogDisplaySettings>(read());

  return {
    get current() {
      return current;
    },
    set(change) {
      current = { ...current, ...change };
      try {
        storage()?.setItem(LOG_DISPLAY_KEY, JSON.stringify(current));
      } catch {
        // The choice still lasts until the page is left.
      }
    },
  };
};
