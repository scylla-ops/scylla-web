import type { MessageDescriptor } from '@lingui/core';
import type { Component } from 'svelte';
import type { XYPosition } from '@xyflow/svelte';
import LayoutListIcon from '@lucide/svelte/icons/layout-list';
import SquareIcon from '@lucide/svelte/icons/square';
import type { LucideIcon } from '@scylla/ui';
import type { NodeAppearance } from '@base/features/pipeline/presentation/ui/editor/blueprint/node-appearance.svelte.ts';
import { blueprintMessages } from '../blueprint.messages.ts';
import { DETAILED_ANCHOR, MINIMAL_ANCHOR } from './node-geometry.ts';
import type { StartNodeViewProps, StepNodeViewProps } from './node-view.ts';
import StartNodeDetailed from './StartNodeDetailed.svelte';
import StartNodeMinimal from './StartNodeMinimal.svelte';
import StepNodeDetailed from './StepNodeDetailed.svelte';
import StepNodeMinimal from './StepNodeMinimal.svelte';

interface NodeAppearanceView {
  step: Component<StepNodeViewProps>;
  start: Component<StartNodeViewProps>;
  /** The point of a new node that lands where it is dropped or picked. */
  anchor: XYPosition;
  label: MessageDescriptor;
  icon: LucideIcon;
}

/** One entry per style: its views, and how the style switch shows it. */
export const NODE_APPEARANCE_VIEWS: Record<NodeAppearance, NodeAppearanceView> = {
  detailed: {
    step: StepNodeDetailed,
    start: StartNodeDetailed,
    anchor: DETAILED_ANCHOR,
    label: blueprintMessages.styleDetailed,
    icon: LayoutListIcon,
  },
  minimal: {
    step: StepNodeMinimal,
    start: StartNodeMinimal,
    anchor: MINIMAL_ANCHOR,
    label: blueprintMessages.styleMinimal,
    icon: SquareIcon,
  },
};

/** Where a new node goes so that its anchor, not its corner, lands on the point. */
export const nodePositionAt = (appearance: NodeAppearance, { x, y }: XYPosition): XYPosition => {
  const { anchor } = NODE_APPEARANCE_VIEWS[appearance];
  return { x: x - anchor.x, y: y - anchor.y };
};
