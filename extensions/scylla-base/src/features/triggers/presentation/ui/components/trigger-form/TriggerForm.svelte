<script lang="ts">
  import {
    Badge,
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { createMutation } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import type {
    CreatedTrigger,
    TriggerEntity,
  } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import {
    TriggerKind,
    type TriggerDraftKind,
  } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { triggerMutations } from '@base/features/triggers/presentation/triggers.queries.ts';
  import { convertCronToLocal } from '@base/features/triggers/presentation/mappers/cron-timezone.mapper.ts';
  import { isCronExpressionValid } from '@base/features/triggers/domain/structs/cron-expression.struct.ts';
  import {
    buildTriggerDraft,
    triggerToDraftInputs,
    type DraftInput,
  } from '@base/features/triggers/presentation/mappers/trigger-form.mapper.ts';
  import CronScheduleBuilder from './CronScheduleBuilder/CronScheduleBuilder.svelte';
  import TriggerFormSection from './TriggerFormSection.svelte';
  import TriggerInputsEditor from './TriggerInputsEditor/TriggerInputsEditor.svelte';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    pipelineId: string;
    trigger?: TriggerEntity;
    onCancel: () => void;
    onSaved: (created?: CreatedTrigger) => void;
  }

  let { pipelineId, trigger, onCancel, onSaved }: Props = $props();

  const createTrigger = createMutation(() => triggerMutations.create(pipelineId));
  const updateTrigger = createMutation(() => triggerMutations.update(pipelineId));

  // svelte-ignore state_referenced_locally
  const isEdit = !!trigger;
  const isPending = $derived(createTrigger.isPending || updateTrigger.isPending);

  // Seeded once: the page mounts the form again for another trigger.
  const DEFAULT_CRON = '0 9 * * *';

   
  // svelte-ignore state_referenced_locally
  let name = $state(trigger?.name ?? '');
  // svelte-ignore state_referenced_locally
  let kind = $state<TriggerDraftKind>(
    trigger?.source.kind === TriggerKind.Webhook ? TriggerKind.Webhook : TriggerKind.Cron,
  );
  // svelte-ignore state_referenced_locally
  let cronExpression = $state(
    trigger?.source.kind === TriggerKind.Cron ? trigger.source.expression : DEFAULT_CRON,
  );
  // svelte-ignore state_referenced_locally
  let signatureHeader = $state(
    trigger?.source.kind === TriggerKind.Webhook ? trigger.source.signatureHeader : '',
  );
  // svelte-ignore state_referenced_locally
  let inputs = $state<DraftInput[]>(triggerToDraftInputs(trigger));
   

  /** An unknown source arm cannot be rendered, so it cannot be sent again. */
  // svelte-ignore state_referenced_locally
  const isUnknownSource = trigger?.source.kind === TriggerKind.Unknown;

  const isValid = $derived(
    !isUnknownSource &&
      name.trim().length > 0 &&
      (kind === TriggerKind.Cron ? isCronExpressionValid(cronExpression) : true),
  );

  const initialCron = $derived(
    trigger?.source.kind === TriggerKind.Cron
      ? convertCronToLocal(trigger.source.expression)
      : DEFAULT_CRON,
  );

  const handleSubmit = async () => {
    const draft = buildTriggerDraft({ name, kind, cronExpression, signatureHeader, inputs });

    try {
      if (isEdit && trigger) {
        await updateTrigger.mutateAsync({ triggerId: trigger.id, draft });
        onSaved();
      } else {
        const created = await createTrigger.mutateAsync(draft);
        onSaved(created);
      }
    } catch {
      // The global mutation handler toasts the error.
    }
  };
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3">
  <div class="relative -mx-1 min-h-0 flex-1 overflow-y-auto px-1 pr-2 pb-1">
    <div class="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="flex flex-col gap-5">
        <TriggerFormSection
          id="trigger-general-title"
          title={t(triggersMessages.generalSection)}
          hint={t(triggersMessages.generalSectionHint)}
        >
          <div class="flex flex-col gap-1.5">
            <Label for="trigger-name">{t(triggersMessages.name)}</Label>
            <Input
              id="trigger-name"
              autofocus
              value={name}
              disabled={isPending}
              placeholder="nightly-build"
              oninput={event => (name = event.currentTarget.value)}
            />
          </div>

          {#if isEdit}
            <div class="flex flex-col gap-1.5">
              <Label>{t(triggersMessages.type)}</Label>
              <div class="flex items-center gap-2">
                <Badge variant="secondary">
                  {isUnknownSource
                    ? t(triggersMessages.unknown)
                    : kind === TriggerKind.Cron
                      ? 'Cron'
                      : 'Webhook'}
                </Badge>
                <span class="text-xs text-muted-foreground">{t(triggersMessages.typeLocked)}</span>
              </div>
            </div>
          {:else}
            <div class="flex flex-col gap-1.5">
              <Label for="trigger-kind">{t(triggersMessages.type)}</Label>
              <Select
                type="single"
                value={kind}
                disabled={isPending}
                onValueChange={value => (kind = value as TriggerDraftKind)}
              >
                <SelectTrigger id="trigger-kind" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TriggerKind.Cron} label="Cron">Cron</SelectItem>
                  <SelectItem value={TriggerKind.Webhook} label="Webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          {/if}
        </TriggerFormSection>

        {#if kind === TriggerKind.Cron}
          <TriggerFormSection
            id="trigger-schedule-title"
            title={t(triggersMessages.schedule)}
            hint={t(triggersMessages.scheduleSectionHint)}
          >
            <CronScheduleBuilder
              initialValue={initialCron}
              onChange={expression => (cronExpression = expression)}
            />
          </TriggerFormSection>
        {:else}
          <TriggerFormSection
            id="trigger-webhook-title"
            title={t(triggersMessages.webhookSection)}
            hint={t(triggersMessages.webhookSectionHint)}
          >
            <div class="flex flex-col gap-1.5">
              <Label for="trigger-header">{t(triggersMessages.signatureHeader)}</Label>
              <Input
                id="trigger-header"
                value={signatureHeader}
                disabled={isPending}
                placeholder="X-Hub-Signature-256"
                oninput={event => (signatureHeader = event.currentTarget.value)}
              />
              <p class="text-xs text-muted-foreground">{t(triggersMessages.signatureHeaderHint)}</p>
            </div>
          </TriggerFormSection>
        {/if}
      </div>

      <div class="flex flex-col gap-5">
        <TriggerFormSection
          id="trigger-inputs-title"
          title={t(triggersMessages.inputs)}
          hint={t(triggersMessages.inputsSectionHint)}
        >
          <TriggerInputsEditor
            {inputs}
            onChange={next => (inputs = next)}
            allowJsonPointer={kind === TriggerKind.Webhook}
          />
        </TriggerFormSection>
      </div>
    </div>
  </div>

  <div class="flex shrink-0 flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
    <Button type="button" variant="outline" onclick={onCancel} disabled={isPending}>
      {t(triggersMessages.cancel)}
    </Button>
    <Button type="button" onclick={() => void handleSubmit()} disabled={!isValid || isPending}>
      {isEdit ? t(triggersMessages.save) : t(triggersMessages.create)}
    </Button>
  </div>
</div>
