<script lang="ts">
  import {
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    blankOperand,
    type Operand,
  } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import { operandKinds } from '@base/features/pipeline/presentation/presenters/switch-form.presenter.ts';

  interface Props {
    operand: Operand;
    side: 'left' | 'right';
    /** The env names of the node: the hints of a variable. */
    varNames: string[];
    /** The nodes that run a step before the switch: an output is one of theirs. */
    outputNodes: string[];
    onChange: (operand: Operand) => void;
  }

  let { operand, side, varNames, outputNodes, onChange }: Props = $props();

  const uid = $props.id();
  const kinds = $derived(operandKinds());
  const valueLabel = $derived(t(side === 'left' ? nodeMessages.leftValue : nodeMessages.rightValue));
  /** A node that is no longer before the switch stays in the list: the issue names it. */
  const nodes = $derived.by(() => {
    const kept = operand.kind === 'output' && operand.node ? [operand.node] : [];
    return [...new Set([...outputNodes, ...kept])].map(node => ({ value: node, label: node }));
  });
</script>

<!-- A value of a rule: its kind, then the name of a variable, a key of an output, or a text. -->
<div class="flex min-w-0 flex-wrap gap-1.5">
  <Select
    type="single"
    value={operand.kind}
    items={kinds}
    onValueChange={kind => kind !== operand.kind && onChange(blankOperand(kind as Operand['kind']))}
  >
    <SelectTrigger
      aria-label={t(side === 'left' ? nodeMessages.leftKind : nodeMessages.rightKind)}
      class="w-26 shrink-0"
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {#each kinds as kind (kind.value)}
        <SelectItem value={kind.value} label={kind.label}>{kind.label}</SelectItem>
      {/each}
    </SelectContent>
  </Select>

  {#if operand.kind === 'var'}
    <Input
      value={operand.name}
      list="{uid}-names"
      aria-label={valueLabel}
      placeholder="SCYLLA_BRANCH"
      class="h-8 min-w-0 flex-1 font-mono"
      oninput={event => onChange({ kind: 'var', name: event.currentTarget.value })}
    />
    <datalist id="{uid}-names">
      {#each varNames as name (name)}
        <option value={name}></option>
      {/each}
    </datalist>
  {:else if operand.kind === 'output'}
    {@const output = operand}
    <Select
      type="single"
      value={output.node}
      items={nodes}
      onValueChange={node => onChange({ ...output, node })}
    >
      <SelectTrigger aria-label={t(nodeMessages.outputNode)} class="min-w-0 flex-1 font-mono">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {#each nodes as node (node.value)}
          <SelectItem value={node.value} label={node.label} class="font-mono">{node.label}</SelectItem>
        {/each}
      </SelectContent>
    </Select>
    <Input
      value={output.key}
      aria-label={t(nodeMessages.outputKey)}
      placeholder="KEY"
      class="h-8 w-28 font-mono"
      oninput={event => onChange({ ...output, key: event.currentTarget.value })}
    />
  {:else}
    <Input
      value={operand.value}
      aria-label={valueLabel}
      class="h-8 min-w-0 flex-1"
      oninput={event => onChange({ kind: 'literal', value: event.currentTarget.value })}
    />
  {/if}
</div>
