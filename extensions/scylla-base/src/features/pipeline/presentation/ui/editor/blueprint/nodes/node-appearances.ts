import type { MessageDescriptor } from '@lingui/core';
import type { Component } from 'svelte';
import LayoutListIcon from '@lucide/svelte/icons/layout-list';
import SquareIcon from '@lucide/svelte/icons/square';
import type { LucideIcon } from '@scylla/ui';
import type { NodeAppearance } from '@base/features/pipeline/presentation/node-appearance.svelte.ts';
import { blueprintMessages } from '../blueprint.messages.ts';
import type { StepNodeViewProps } from './node-view.ts';
import StepNodeDetailed from './StepNodeDetailed.svelte';
import StepNodeMinimal from './StepNodeMinimal.svelte';

/** One entry per style: the view of a step, and how the style switch shows it. */
export const NODE_APPEARANCE_VIEWS: Record<
  NodeAppearance,
  { view: Component<StepNodeViewProps>; label: MessageDescriptor; icon: LucideIcon }
> = {
  detailed: {
    view: StepNodeDetailed,
    label: blueprintMessages.styleDetailed,
    icon: LayoutListIcon,
  },
  minimal: { view: StepNodeMinimal, label: blueprintMessages.styleMinimal, icon: SquareIcon },
};
