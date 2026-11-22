<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { Button, Label, Switch } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { MAX_CASES } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import type { NodeDraft } from '../node-draft.state.svelte.ts';
  import PortNameField from './PortNameField.svelte';
  import SwitchCase from './SwitchCase.svelte';

  interface Props {
    draft: NodeDraft;
    /** The nodes that run a step before this switch: the outputs it can read. */
    outputNodes: string[];
  }

  let { draft, outputNodes }: Props = $props();

  const uid = $props.id();
  const switchDraft = $derived(draft.switch);
  const varNames = $derived(draft.envRows.map(row => row.key.trim()).filter(Boolean));
</script>

<!-- The cases of a switch, in order, then what happens when several match or none does. -->
<div class="flex flex-col gap-2.5">
  <span class="text-sm font-medium">{t(nodeMessages.cases)}</span>
  {#each switchDraft.cases as entry, index (index)}
    <SwitchCase {switchDraft} {entry} {index} count={switchDraft.cases.length} {varNames} {outputNodes} />
  {/each}
  <Button
    variant="outline"
    size="sm"
    class="self-start"
    disabled={switchDraft.cases.length >= MAX_CASES}
    onclick={() => switchDraft.addCase()}
  >
    <PlusIcon class="size-4" />
    {t(nodeMessages.addCase)}
  </Button>

  <div class="mt-1 flex items-center gap-2">
    <Switch
      id="{uid}-all"
      checked={switchDraft.allMatches}
      onCheckedChange={on => (switchDraft.allMatches = on)}
    />
    <Label for="{uid}-all">{t(nodeMessages.allMatches)}</Label>
  </div>
  <div class="flex items-center gap-2">
    <Switch
      id="{uid}-otherwise"
      checked={switchDraft.otherwise !== undefined}
      onCheckedChange={on => switchDraft.setOtherwise(on)}
    />
    <Label for="{uid}-otherwise">{t(nodeMessages.otherwise)}</Label>
  </div>
  {#if switchDraft.otherwise !== undefined}
    <PortNameField
      value={switchDraft.otherwise}
      label={t(nodeMessages.otherwisePort)}
      onCommit={name => switchDraft.renameOtherwise(name)}
    />
  {/if}
</div>
