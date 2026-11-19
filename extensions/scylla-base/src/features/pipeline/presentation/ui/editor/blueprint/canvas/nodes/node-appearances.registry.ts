import type { MessageDescriptor } from '@lingui/core';
import type { Component } from 'svelte';
import type { XYPosition } from '@xyflow/svelte';
import LayoutListIcon from '@lucide/svelte/icons/layout-list';
import SquareIcon from '@lucide/svelte/icons/square';
import type { LucideIcon } from '@scylla/ui';
import type { NodeAppearance } from '@base/features/pipeline/presentation/ui/editor/blueprint/canvas/node-appearance-preference.state.svelte.ts';
import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
import {
  DETAILED_ANCHOR,
  DETAILED_FOOTPRINT,
  MINIMAL_ANCHOR,
  MINIMAL_FOOTPRINT,
  type NodeFootprint,
} from '@base/features/pipeline/presentation/presenters/blueprint-geometry.presenter.ts';
import type { NodeSummary } from '@base/features/pipeline/presentation/presenters/node-summary.presenter.ts';
import type { BlockSummary } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import StartNodeDetailed from './StartNodeDetailed.svelte';
import StartNodeMinimal from './StartNodeMinimal.svelte';
import PipelineNodeDetailed from './PipelineNodeDetailed.svelte';
import PipelineNodeMinimal from './PipelineNodeMinimal.svelte';
import FragmentNodeDetailed from './FragmentNodeDetailed.svelte';
import FragmentNodeMinimal from './FragmentNodeMinimal.svelte';

export interface PipelineNodeViewProps {
  node: PipelineNodeEntity;
  selected: boolean;
  summary: NodeSummary;
  /** No edge goes into the node: saving links it to the start node. */
  detached: boolean;
}

export interface FragmentNodeViewProps {
  /** The id of the block: the name of the fragment, or that name with a suffix. */
  name: string;
  nodeCount: number;
  summary: BlockSummary;
  selected: boolean;
  detached: boolean;
}

export interface StartNodeViewProps {
  name: string;
  selected: boolean;
}

interface NodeAppearanceView {
  node: Component<PipelineNodeViewProps>;
  fragment: Component<FragmentNodeViewProps>;
  start: Component<StartNodeViewProps>;
  /** The point of a new node that lands where it is dropped or picked. */
  anchor: XYPosition;
  footprint: NodeFootprint;
  label: MessageDescriptor;
  icon: LucideIcon;
}

/** One entry per style: its views, and how the style switch shows it. */
export const NODE_APPEARANCE_VIEWS: Record<NodeAppearance, NodeAppearanceView> = {
  detailed: {
    node: PipelineNodeDetailed,
    fragment: FragmentNodeDetailed,
    start: StartNodeDetailed,
    anchor: DETAILED_ANCHOR,
    footprint: DETAILED_FOOTPRINT,
    label: blueprintMessages.styleDetailed,
    icon: LayoutListIcon,
  },
  minimal: {
    node: PipelineNodeMinimal,
    fragment: FragmentNodeMinimal,
    start: StartNodeMinimal,
    anchor: MINIMAL_ANCHOR,
    footprint: MINIMAL_FOOTPRINT,
    label: blueprintMessages.styleMinimal,
    icon: SquareIcon,
  },
};

/** Where a new node goes so that its anchor, not its corner, lands on the point. */
export const nodePositionAt = (appearance: NodeAppearance, { x, y }: XYPosition): XYPosition => {
  const { anchor } = NODE_APPEARANCE_VIEWS[appearance];
  return { x: x - anchor.x, y: y - anchor.y };
};
