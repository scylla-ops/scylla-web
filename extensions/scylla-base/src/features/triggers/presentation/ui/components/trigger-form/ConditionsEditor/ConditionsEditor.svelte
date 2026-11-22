<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    MAX_CONDITIONS,
    type WebhookCondition,
  } from '@base/features/triggers/domain/structs/webhook-condition.struct.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
  import ConditionRow from './ConditionRow.svelte';

  interface Props {
    conditions: WebhookCondition[];
    disabled?: boolean;
    onChange: (conditions: WebhookCondition[]) => void;
  }

  let { conditions, disabled = false, onChange }: Props = $props();

  // A draft condition has no id: each row gets a key, so a removal keeps the state of the others.
  // The form is seeded once, and only this editor changes the list.
  // svelte-ignore state_referenced_locally
  let keys = $state<number[]>(conditions.map((_, index) => index));
  // svelte-ignore state_referenced_locally
  let nextKey = conditions.length;

  const add = () => {
    keys.push(nextKey++);
    onChange([...conditions, { source: 'header', field: '', operator: 'is', values: [] }]);
  };

  const remove = (index: number) => {
    keys.splice(index, 1);
    onChange(conditions.filter((_, i) => i !== index));
  };

  const update = (index: number, next: WebhookCondition) =>
    onChange(conditions.map((condition, i) => (i === index ? next : condition)));
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-end">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onclick={add}
      disabled={disabled || conditions.length >= MAX_CONDITIONS}
      class="gap-1"
    >
      <PlusIcon class="size-4" />
      {t(triggersMessages.addCondition)}
    </Button>
  </div>

  {#if conditions.length === 0}
    <p class="text-xs text-muted-foreground">{t(triggersMessages.noCondition)}</p>
  {:else}
    {#each conditions as condition, index (keys[index] ?? index)}
      {#if index > 0}
        <!-- "and" is centered on the fields: the spacer is the column of the remove button. -->
        <div class="flex items-center gap-2" aria-hidden="true">
          <div class="flex flex-1 items-center justify-center gap-3">
            <span class="h-px flex-1 bg-border"></span>
            <span class="text-xs font-medium text-muted-foreground">
              {t(triggersMessages.conditionAnd)}
            </span>
            <span class="h-px flex-1 bg-border"></span>
          </div>
          <span class="w-8 shrink-0"></span>
        </div>
      {/if}
      <ConditionRow
        id={`condition-${keys[index] ?? index}`}
        {condition}
        {disabled}
        onChange={next => update(index, next)}
        onRemove={() => remove(index)}
      />
    {/each}
  {/if}
</div>
