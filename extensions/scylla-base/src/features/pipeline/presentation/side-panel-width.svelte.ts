/** The side panel of the blueprint: the palette, or the inspector of a step. */
export type SidePanelMode = 'palette' | 'inspector';

export const SIDE_PANEL_WIDTHS = {
  palette: { initial: 288, min: 240, max: 480 },
  inspector: { initial: 480, min: 360, max: 960 },
} as const satisfies Record<SidePanelMode, { initial: number; min: number; max: number }>;

const STORAGE_KEY = 'scylla.blueprint.side-panel-width';

type Widths = Record<SidePanelMode, number>;

const INITIAL: Widths = {
  palette: SIDE_PANEL_WIDTHS.palette.initial,
  inspector: SIDE_PANEL_WIDTHS.inspector.initial,
};

const inBounds = (mode: SidePanelMode, value: unknown): value is number =>
  typeof value === 'number' &&
  value >= SIDE_PANEL_WIDTHS[mode].min &&
  value <= SIDE_PANEL_WIDTHS[mode].max;

/**
 * The width the viewer gave the side panel, one per mode, remembered by the browser. The
 * inspector holds code: it is wider than the palette, and keeps its own width.
 */
export const createSidePanelWidth = (
  storage: () => Storage | undefined = () => globalThis.localStorage,
) => {
  const read = (): Widths => {
    try {
      const stored = JSON.parse(storage()?.getItem(STORAGE_KEY) ?? '{}') as Partial<Widths>;
      return {
        palette: inBounds('palette', stored.palette) ? stored.palette : INITIAL.palette,
        inspector: inBounds('inspector', stored.inspector) ? stored.inspector : INITIAL.inspector,
      };
    } catch {
      return INITIAL;
    }
  };

  let widths = $state<Widths>(read());

  return {
    of: (mode: SidePanelMode) => widths[mode],
    set(mode: SidePanelMode, width: number) {
      widths = { ...widths, [mode]: width };
      try {
        storage()?.setItem(STORAGE_KEY, JSON.stringify(widths));
      } catch {
        // The width still lasts until the page is left.
      }
    },
  };
};

export type SidePanelWidth = ReturnType<typeof createSidePanelWidth>;
