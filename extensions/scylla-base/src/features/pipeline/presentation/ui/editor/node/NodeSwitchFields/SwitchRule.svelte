<script lang="ts">
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import {
    Button,
    Select,
    SelectContent,
    SelectGroup,
    SelectGroupHeading,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type {
    Operand,
    SwitchRule,
    SwitchTest,
  } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import {
    testChoices,
    testGroups,
  } from '@base/features/pipeline/presentation/presenters/switch-form.presenter.ts';
  import SwitchOperand from './SwitchOperand.svelte';

  interface Props {
    rule: SwitchRule;
    varNames: string[];
    outputNodes: string[];
    /** A case keeps one rule at least: the server needs it. */
    removable: boolean;
    onTest: (test: SwitchTest) => void;
    onOperand: (side: 'left' | 'right', operand: Operand) => void;
    onRemove: () => void;
  }

  let { rule, varNames, outputNodes, removable, onTest, onOperand, onRemove }: Props = $props();

  const groups = $derived(testGroups());
</script>

<!-- A rule: the left value, the test, and the right value but for `empty` and `not_empty`. -->
<div class="flex flex-col gap-1.5 rounded-md bg-muted/40 p-2">
  <SwitchOperand
    operand={rule.left}
    side="left"
    {varNames}
    {outputNodes}
    onChange={operand => onOperand('left', operand)}
  />
  <div class="flex items-center gap-1.5">
    <Select
      type="single"
      value={rule.test}
      items={testChoices()}
      onValueChange={test => onTest(test as SwitchTest)}
    >
      <SelectTrigger aria-label={t(nodeMessages.test)} class="min-w-0 flex-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {#each groups as group (group.label)}
          <SelectGroup>
            <SelectGroupHeading>{group.label}</SelectGroupHeading>
            {#each group.tests as test (test.value)}
              <SelectItem value={test.value} label={test.label}>{test.label}</SelectItem>
            {/each}
          </SelectGroup>
        {/each}
      </SelectContent>
    </Select>
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t(nodeMessages.deleteRule)}
      disabled={!removable}
      onclick={onRemove}
    >
      <Trash2Icon class="size-4" />
    </Button>
  </div>
  {#if rule.right}
    <SwitchOperand
      operand={rule.right}
      side="right"
      {varNames}
      {outputNodes}
      onChange={operand => onOperand('right', operand)}
    />
  {/if}
</div>
