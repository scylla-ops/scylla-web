import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import type { ResizablePaneApi } from '@scylla/ui/primitives';
import { createCompactContainer } from '@scylla/ui/state';

const LIST_AUTO_HIDE_PX = 800;
const PROPERTIES_AUTO_HIDE_PX = 1100;

// In percent of the group they belong to: the view for the list, the middle and the properties,
// the middle for the panes of the open steps.
export const STEPS_VIEW_SIZES = {
  list: { default: 18, min: 14, max: 30 },
  middle: { min: 25 },
  pane: { min: 25 },
  properties: { default: 30, min: 22, max: 45 },
} as const;

export interface SidePanel {
  readonly open: boolean;
  /**
   * The size the pane starts at, in percent: that of the state at the moment of the creation. It
   * never changes: a change of `defaultSize` makes paneforge build the layout of the group again.
   */
  readonly defaultSize: number;
  /** False until the width of the view was measured: before it, `open` is a guess. */
  readonly measured: boolean;
  /** The pane of the panel, set by `bind:this`. */
  pane: ResizablePaneApi | undefined;
  toggle(): void;
  onCollapse(): void;
  onExpand(): void;
  measure: Attachment<HTMLElement>;
}

// Narrower than the threshold, the panel starts hidden; the user's choice wins for the visit.
// The pane follows `open`, and a drag that collapses or expands the pane sets the choice.
// A panel that is `available() === false` (nothing to show) is closed, and keeps the choice.
const createSidePanel = (
  threshold: number,
  available: () => boolean,
  openSize: number,
): SidePanel => {
  const compact = createCompactContainer(threshold);
  let choice = $state<boolean | undefined>();
  let pane = $state.raw<ResizablePaneApi>();
  const open = $derived(available() && (choice ?? !compact.isCompact));

  const defaultSize = untrack(() => (open ? openSize : 0));

  // The call is untracked: a drag that moves the pane must not run this again and undo it.
  $effect(() => {
    const target = open;
    if (!pane) return;
    const api = pane;
    untrack(() => {
      // paneforge has no layout yet: the pane starts at `defaultSize`, which is `open` as it was.
      if (api.getSize() === undefined) return;
      if (target) api.expand();
      else api.collapse();
    });
  });

  return {
    get open() {
      return open;
    },
    defaultSize,
    get measured() {
      return compact.measured;
    },
    get pane() {
      return pane;
    },
    set pane(value) {
      pane = value ?? undefined;
    },
    toggle: () => (choice = !open),
    // A collapse that the width or the lack of content caused finds the panel closed already:
    // no choice is stored.
    onCollapse() {
      if (open) choice = false;
    },
    onExpand() {
      if (!open && available()) choice = true;
    },
    measure: compact.measure,
  };
};

export interface StepsViewOptions {
  /** False when no step is focused: the properties have nothing to show. */
  hasProperties?: () => boolean;
}

export const createStepsViewState = ({ hasProperties = () => true }: StepsViewOptions = {}) => {
  const list = createSidePanel(LIST_AUTO_HIDE_PX, () => true, STEPS_VIEW_SIZES.list.default);
  const properties = createSidePanel(
    PROPERTIES_AUTO_HIDE_PX,
    hasProperties,
    STEPS_VIEW_SIZES.properties.default,
  );

  // The first measure can hide a panel: that change is not animated, or a narrow view would
  // paint its panels open and close them. Both panels are measured on the same element.
  let animated = $state(false);
  $effect(() => {
    if (!list.measured) return;
    const frame = requestAnimationFrame(() => (animated = true));
    return () => cancelAnimationFrame(frame);
  });

  return {
    list,
    properties,
    /** False until a frame after the first measure. */
    get animated() {
      return animated;
    },
  };
};
