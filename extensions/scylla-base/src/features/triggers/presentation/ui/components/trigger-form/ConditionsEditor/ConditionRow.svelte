<script lang="ts">
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import {
    Button,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    conditionFieldIssue,
    conditionValuesIssue,
    withOperator,
    type ConditionValueIssue,
    type WebhookCondition,
    type WebhookConditionOperator,
    type WebhookConditionSource,
  } from '@base/features/triggers/domain/structs/webhook-condition.struct.ts';
  import {
    conditionFieldIssueText,
    conditionFieldPlaceholder,
    conditionOperatorOptions,
    conditionSourceOptions,
    conditionValueIssueText,
    conditionValuePlaceholder,
  } from '@base/features/triggers/presentation/presenters/webhook-condition.presenter.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
  import ConditionValuesInput from './ConditionValuesInput.svelte';

  interface Props {
    /** The prefix of the ids of the fields. */
    id: string;
    condition: WebhookCondition;
    disabled?: boolean;
    onChange: (condition: WebhookCondition) => void;
    onRemove: () => void;
  }

  let { id, condition, disabled = false, onChange, onRemove }: Props = $props();

  // A field that lost the focus once shows its error. A new condition shows none yet.
  let fieldTouched = $state(false);
  let valueTouched = $state(false);
  let chipIssue = $state<ConditionValueIssue | null>(null);

  const sources = $derived(conditionSourceOptions());
  const operators = $derived(conditionOperatorOptions());
  const fieldIssue = $derived(fieldTouched ? conditionFieldIssue(condition) : null);
  const valueIssue = $derived(chipIssue ?? (valueTouched ? conditionValuesIssue(condition) : null));
  const fieldError = $derived(fieldIssue ? conditionFieldIssueText(fieldIssue) : null);
  const valueError = $derived(valueIssue ? conditionValueIssueText(valueIssue) : null);

  const changeOperator = (operator: WebhookConditionOperator) => {
    chipIssue = null;
    onChange(withOperator(condition, operator));
  };
</script>

{#snippet errorLine(errorId: string, text: string)}
  <!-- The spacer puts the error under the field, after the menu. -->
  <div class="flex items-center gap-2">
    <span class="w-28 shrink-0" aria-hidden="true"></span>
    <p id={errorId} class="text-xs text-destructive">{text}</p>
  </div>
{/snippet}

<div class="flex items-center gap-2">
  <div class="flex min-w-0 flex-1 flex-col gap-2">
    <div class="flex items-center gap-2">
      <Select
        type="single"
        value={condition.source}
        items={sources}
        {disabled}
        onValueChange={value => onChange({ ...condition, source: value as WebhookConditionSource })}
      >
        <SelectTrigger class="w-28 shrink-0" aria-label={t(triggersMessages.conditionSource)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {#each sources as option (option.value)}
            <SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
      <Input
        id={`${id}-field`}
        value={condition.field}
        {disabled}
        placeholder={conditionFieldPlaceholder(condition.source)}
        aria-label={condition.source === 'header'
          ? t(triggersMessages.conditionHeaderName)
          : t(triggersMessages.jsonPointer)}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? `${id}-field-error` : undefined}
        oninput={event => onChange({ ...condition, field: event.currentTarget.value })}
        onblur={() => (fieldTouched = true)}
        class="min-w-0 flex-1 font-mono"
      />
    </div>
    {#if fieldError}
      {@render errorLine(`${id}-field-error`, fieldError)}
    {/if}

    <div class="flex items-center gap-2">
      <Select
        type="single"
        value={condition.operator}
        items={operators}
        {disabled}
        onValueChange={value => changeOperator(value as WebhookConditionOperator)}
      >
        <SelectTrigger class="w-28 shrink-0" aria-label={t(triggersMessages.conditionOperator)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {#each operators as option (option.value)}
            <SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
      {#if condition.operator === 'oneOf'}
        <ConditionValuesInput
          id={`${id}-value`}
          label={t(triggersMessages.conditionValue)}
          values={condition.values}
          placeholder={t(triggersMessages.addConditionValue)}
          invalid={!!valueError}
          describedBy={valueError ? `${id}-value-error` : undefined}
          {disabled}
          onChange={values => onChange({ ...condition, values })}
          onIssue={issue => (chipIssue = issue)}
          onblur={() => (valueTouched = true)}
        />
      {:else}
        <Input
          id={`${id}-value`}
          value={condition.values[0] ?? ''}
          {disabled}
          placeholder={conditionValuePlaceholder(condition)}
          aria-label={t(triggersMessages.conditionValue)}
          aria-invalid={valueError ? true : undefined}
          aria-describedby={valueError ? `${id}-value-error` : undefined}
          oninput={event => onChange({ ...condition, values: [event.currentTarget.value] })}
          onblur={() => (valueTouched = true)}
          class="min-w-0 flex-1"
        />
      {/if}
    </div>
    {#if valueError}
      {@render errorLine(`${id}-value-error`, valueError)}
    {/if}
  </div>

  <Button
    type="button"
    variant="ghost-destructive"
    size="icon"
    {disabled}
    onclick={onRemove}
    class="size-8 shrink-0"
  >
    <Trash2Icon class="size-4" />
    <span class="sr-only">{t(triggersMessages.removeCondition)}</span>
  </Button>
</div>
