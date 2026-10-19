/** The jobs open in one pane, and the one it shows. */
export interface JobPane {
  tabs: string[];
  active: string | null;
}

/** Two jobs side by side, as in an IDE: one pane, or two. */
export const MAX_PANES = 2;

const emptyPane = (): JobPane => ({ tabs: [], active: null });

/**
 * The open jobs of the scripting view. A job removed from the document leaves its tabs: the
 * panes are derived from the ids that exist. Until a job is opened, the first one is shown.
 */
export const createJobPanes = (ids: () => string[]) => {
  let panes = $state<JobPane[]>([emptyPane()]);
  let focused = $state(0);
  let opened = $state(false);

  const visible = $derived.by((): JobPane[] => {
    const known = ids();
    const shown = panes.map(pane => {
      const tabs = pane.tabs.filter(id => known.includes(id));
      const active =
        pane.active && tabs.includes(pane.active) ? pane.active : (tabs.at(-1) ?? null);
      return { tabs, active };
    });

    const first = known[0];
    if (!opened && first && !shown[0]?.tabs.length) shown[0] = { tabs: [first], active: first };
    return shown;
  });

  const focusedIndex = $derived(Math.min(focused, visible.length - 1));

  /** Each change starts from what is shown: a tab of a removed job is dropped for good. */
  const write = (next: JobPane[], focus: number) => {
    panes = next;
    focused = focus;
    opened = true;
  };

  const copy = () => visible.map(pane => ({ tabs: [...pane.tabs], active: pane.active }));

  const open = (id: string, index = focusedIndex) => {
    const next = copy();
    const pane = next[index] ?? emptyPane();
    if (!pane.tabs.includes(id)) pane.tabs.push(id);
    pane.active = id;
    next[index] = pane;
    write(next, index);
  };

  return {
    get panes() {
      return visible;
    },
    get focused() {
      return focusedIndex;
    },
    /** The job of the focused pane: the properties panel shows it. */
    get focusedJob() {
      return visible[focusedIndex]?.active ?? null;
    },
    get canSplit() {
      return visible.length < MAX_PANES;
    },

    open,

    /** Opens the job in the other pane, which is created when there is one pane only. */
    openToSide(id: string) {
      if (visible.length < MAX_PANES) {
        write([...copy(), { tabs: [id], active: id }], visible.length);
      } else {
        open(id, focusedIndex === 0 ? 1 : 0);
      }
    },

    /** Shows the job of the focused pane in a new pane too. */
    split() {
      const active = visible[focusedIndex]?.active;
      if (active && visible.length < MAX_PANES) write([...copy(), { tabs: [active], active }], 1);
    },

    /** Closes a tab. A second pane with no tab left closes too. */
    close(id: string, index: number) {
      const next = copy();
      const pane = next[index];
      if (!pane) return;

      const position = pane.tabs.indexOf(id);
      pane.tabs = pane.tabs.filter(tab => tab !== id);
      if (pane.active === id) pane.active = pane.tabs[Math.max(0, position - 1)] ?? null;

      const kept = next.length > 1 && !pane.tabs.length ? next.filter((_, i) => i !== index) : next;
      write(kept, Math.min(focusedIndex, kept.length - 1));
    },

    closePane(index: number) {
      if (visible.length > 1)
        write(
          copy().filter((_, i) => i !== index),
          0,
        );
    },

    focus(index: number) {
      focused = index;
    },

    /** Follows a rename. Called before the document changes: the old id is still known. */
    rename(from: string, to: string) {
      write(
        copy().map(pane => ({
          tabs: pane.tabs.map(id => (id === from ? to : id)),
          active: pane.active === from ? to : pane.active,
        })),
        focusedIndex,
      );
    },
  };
};

export type JobPanes = ReturnType<typeof createJobPanes>;
