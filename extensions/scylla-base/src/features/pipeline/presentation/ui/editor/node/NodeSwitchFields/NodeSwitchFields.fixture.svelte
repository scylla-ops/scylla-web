<script lang="ts">
  import type {
    NodeDefinition,
    SwitchPipelineNodeEntity,
  } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { createNodeDraft } from '../node-draft.state.svelte.ts';
  import type { PortChange } from '../switch-draft.state.svelte.ts';
  import NodeSwitchFields from './NodeSwitchFields.svelte';

  interface Props {
    node: SwitchPipelineNodeEntity;
    outputNodes: string[];
    onChange: (value: NodeDefinition, port?: PortChange) => void;
  }

  let { node, outputNodes, onChange }: Props = $props();

  // svelte-ignore state_referenced_locally
  const draft = createNodeDraft({ node, onChange: (...change) => onChange(...change), onRename: id => id });
</script>

<NodeSwitchFields {draft} {outputNodes} />
