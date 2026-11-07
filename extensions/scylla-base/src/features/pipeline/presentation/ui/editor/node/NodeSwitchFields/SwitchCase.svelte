<script lang="ts">
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    MAX_RULES,
    type SwitchCase,
  } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import Segmented from '@base/features/pipeline/presentation/ui/editor/controls/Segmented.svelte';
  import type { SwitchDraft } from '../switch-draft.state.svelte.ts';
  import PortNameField from './PortNameField.svelte';
  import SwitchRule from './SwitchRule.svelte';

  interface Props {
    switchDraft: SwitchDraft;
    entry: SwitchCase;
    index: number;
    count: number;
    varNames: string[];
    outputNodes: string[];
  }

  let { switchDraft, entry, index, count, varNames, outputNodes }: Props = $props();

  const combinators = $derived([
    { value: 'all', label: t(nodeMessages.combinatorAll) },
    { value: 'any', label: t(nodeMessages.combinatorAny) },
  ] as const);
</script>

<!-- A case: its port, how its rules combine, its rules. The first case that matches wins: the order matters. -->
<section aria-label={entry.port} class="flex flex-col gap-2 rounded-lg border bg-card p-2.5">
  <!-- On top: the issue of a port name shows under its field. -->
  <div class="flex flex-wrap items-start gap-1.5">
    <PortNameField
      value={entry.port}
      label={t(nodeMessages.portName)}
      onCommit={name => switchDraft.renameCase(index, name)}
      class="min-w-24 flex-1"
    />
    <Segmented
      value={entry.combinator}
      options={combinators}
      label={t(nodeMessages.matchRules)}
      onChange={combinator => switchDraft.setCombinator(index, combinator)}
    />
    <div class="flex">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(nodeMessages.moveCaseUp(entry.port))}
        disabled={index === 0}
        onclick={() => switchDraft.moveCase(index, -1)}
      >
        <ArrowUpIcon class="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(nodeMessages.moveCaseDown(entry.port))}
        disabled={index === count - 1}
        onclick={() => switchDraft.moveCase(index, 1)}
      >
        <ArrowDownIcon class="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        class="text-destructive hover:text-destructive"
        aria-label={t(nodeMessages.deleteCase(entry.port))}
        disabled={count === 1}
        onclick={() => switchDraft.removeCase(index)}
      >
        <Trash2Icon class="size-4" />
      </Button>
    </div>
  </div>

  {#each entry.rules as rule, ruleIndex (ruleIndex)}
    <SwitchRule
      {rule}
      {varNames}
      {outputNodes}
      removable={entry.rules.length > 1}
      onTest={test => switchDraft.setTest(index, ruleIndex, test)}
      onOperand={(side, operand) => switchDraft.setOperand(index, ruleIndex, side, operand)}
      onRemove={() => switchDraft.removeRule(index, ruleIndex)}
    />
  {/each}

  <Button
    variant="ghost"
    size="sm"
    class="self-start"
    disabled={entry.rules.length >= MAX_RULES}
    onclick={() => switchDraft.addRule(index)}
  >
    <PlusIcon class="size-4" />
    {t(nodeMessages.addRule)}
  </Button>
</section>
