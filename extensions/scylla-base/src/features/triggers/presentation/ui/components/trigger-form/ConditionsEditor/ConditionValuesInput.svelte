<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { t } from '@scylla/ui/i18n';
  import {
    conditionValueIssue,
    type ConditionValueIssue,
  } from '@base/features/triggers/domain/structs/webhook-condition.struct.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    id: string;
    /** The name of the field for a screen reader: the chips have no visible label. */
    label: string;
    values: string[];
    placeholder: string;
    invalid?: boolean;
    describedBy?: string;
    disabled?: boolean;
    onChange: (values: string[]) => void;
    /** Why the typed text did not become a chip, or `null` when it did. */
    onIssue: (issue: ConditionValueIssue | null) => void;
    onblur?: () => void;
  }

  let {
    id,
    label,
    values,
    placeholder,
    invalid = false,
    describedBy,
    disabled = false,
    onChange,
    onIssue,
    onblur,
  }: Props = $props();

  let text = $state('');

  /** Enter or a comma adds the text as a chip. A blank text adds nothing. */
  const commit = () => {
    const found = conditionValueIssue(text, values);
    onIssue(found === 'blank' ? null : found);
    if (found) return;
    onChange([...values, text.trim()]);
    text = '';
  };

  const remove = (value: string) => onChange(values.filter(other => other !== value));

  const onkeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && text === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };
</script>

<div
  class={[
    'flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-1 rounded-lg border bg-transparent px-1.5 py-0.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
    invalid ? 'border-destructive' : 'border-border',
  ]}
>
  {#each values as value (value)}
    <span
      class="inline-flex h-6 items-center justify-center gap-1 rounded-md bg-muted px-2 font-mono text-xs"
    >
      {value}
      <button
        type="button"
        class="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        aria-label={t(triggersMessages.removeChip(value))}
        {disabled}
        onclick={() => remove(value)}
      >
        <XIcon class="size-3" />
      </button>
    </span>
  {/each}
  <input
    {id}
    class="h-6 min-w-24 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
    value={text}
    {placeholder}
    {disabled}
    aria-label={label}
    aria-invalid={invalid ? true : undefined}
    aria-describedby={describedBy}
    oninput={event => {
      text = event.currentTarget.value;
      onIssue(null);
    }}
    {onkeydown}
    onblur={() => {
      commit();
      onblur?.();
    }}
  />
</div>
