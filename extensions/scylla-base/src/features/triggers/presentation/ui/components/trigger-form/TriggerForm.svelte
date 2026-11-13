<script lang="ts">
  import { Badge, Button, Input, Label } from '@scylla/ui/primitives';
  import { createMutation } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import type { RepositoryLink } from '@base/features/integrations';
  import type {
    CreatedTrigger,
    GitSource,
    TriggerDraftKind,
    TriggerEntity,
  } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { triggerMutations } from '@base/features/triggers/presentation/triggers.queries.ts';
  import { convertCronToLocal } from '@base/features/triggers/presentation/mappers/cron-timezone.mapper.ts';
  import { isCronExpressionValid } from '@base/features/triggers/domain/structs/cron-expression.struct.ts';
  import {
    buildTriggerDraft,
    triggerToDraftInputs,
    triggerToGitRules,
    type DraftInput,
    type GitRulesDraft,
  } from '@base/features/triggers/presentation/mappers/trigger-form.mapper.ts';
  import {
    gitKindHint,
    triggerKindLabel,
  } from '@base/features/triggers/presentation/presenters/trigger-source.presenter.ts';
  import CronScheduleBuilder from './CronScheduleBuilder/CronScheduleBuilder.svelte';
  import GitRulesFields from './GitRulesFields/GitRulesFields.svelte';
  import GitVariables from './GitVariables/GitVariables.svelte';
  import TriggerFormSection from './TriggerFormSection.svelte';
  import TriggerInputsEditor from './TriggerInputsEditor/TriggerInputsEditor.svelte';
  import TriggerKindSelect from './TriggerKindSelect/TriggerKindSelect.svelte';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    pipelineId: string;
    trigger?: TriggerEntity;
    /** The link of the project: `null` with no link, absent while unknown. */
    link?: RepositoryLink | null;
    /** A file pipeline: the `on` table of its file gives its Git triggers. */
    isFilePipeline?: boolean;
    onCancel: () => void;
    onSaved: (created?: CreatedTrigger) => void;
    onLinkRepository: () => void;
  }

  let {
    pipelineId,
    trigger,
    link,
    isFilePipeline = false,
    onCancel,
    onSaved,
    onLinkRepository,
  }: Props = $props();

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
    !trigger || trigger.source.kind === 'unknown' ? 'cron' : trigger.source.kind,
  );
  // svelte-ignore state_referenced_locally
  let cronExpression = $state(
    trigger?.source.kind === 'cron' ? trigger.source.expression : DEFAULT_CRON,
  );
  // svelte-ignore state_referenced_locally
  let inputs = $state<DraftInput[]>(triggerToDraftInputs(trigger));
  // svelte-ignore state_referenced_locally
  let rules = $state<GitRulesDraft>(triggerToGitRules(trigger));

  /** An unknown source arm cannot be rendered, so it cannot be sent again. */
  // svelte-ignore state_referenced_locally
  const isUnknownSource = trigger?.source.kind === 'unknown';

  const gitSource = $derived<GitSource | null>(
    kind === 'cron' || kind === 'webhook' ? null : rules[kind],
  );

  const isValid = $derived(
    !isUnknownSource &&
      name.trim().length > 0 &&
      (kind === 'cron' ? isCronExpressionValid(cronExpression) : true) &&
      (kind === 'pullRequest' ? rules.pullRequest.events.length > 0 : true),
  );

  const initialCron = $derived(
    trigger?.source.kind === 'cron'
      ? convertCronToLocal(trigger.source.expression)
      : DEFAULT_CRON,
  );

  const changeRules = (source: GitSource) => {
    switch (source.kind) {
      case 'push':
        rules.push = source;
        break;
      case 'pullRequest':
        rules.pullRequest = source;
        break;
      case 'tag':
        rules.tag = source;
        break;
    }
  };

  const handleSubmit = async () => {
    const draft = buildTriggerDraft({ name, kind, cronExpression, inputs, rules });

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
        <div class="contents" data-tour="trigger-general">
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
                  {triggerKindLabel(isUnknownSource ? 'unknown' : kind, link?.provider)}
                </Badge>
                <span class="text-xs text-muted-foreground">{t(triggersMessages.typeLocked)}</span>
              </div>
            </div>
          {:else}
            <TriggerKindSelect
              value={kind}
              gitOff={isFilePipeline ? 'fromFile' : link === null ? 'noLink' : undefined}
              provider={link?.provider}
              disabled={isPending}
              onChange={next => (kind = next)}
              {onLinkRepository}
            />
          {/if}
        </TriggerFormSection>
        </div>

        <div class="contents" data-tour="trigger-when">
        {#if gitSource}
          <TriggerFormSection
            id="trigger-when-title"
            title={t(triggersMessages.whenSection)}
            hint={gitKindHint(gitSource.kind, link)}
          >
            <GitRulesFields
              source={gitSource}
              provider={link?.provider}
              disabled={isPending}
              onChange={changeRules}
            />
          </TriggerFormSection>
        {:else if kind === 'cron'}
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
            <p class="text-xs text-muted-foreground">{t(triggersMessages.signatureHint)}</p>
          </TriggerFormSection>
        {/if}
        </div>
      </div>

      <div class="flex flex-col gap-5">
        {#if gitSource}
          <TriggerFormSection
            id="trigger-variables-title"
            title={t(triggersMessages.variablesSection)}
            hint={t(triggersMessages.variablesHint)}
          >
            <GitVariables kind={gitSource.kind} {link} />
          </TriggerFormSection>
        {/if}
        <TriggerFormSection
          id="trigger-inputs-title"
          title={t(triggersMessages.inputs)}
          hint={t(triggersMessages.inputsSectionHint)}
        >
          <TriggerInputsEditor
            {inputs}
            onChange={next => (inputs = next)}
            allowJsonPointer={kind === 'webhook'}
          />
        </TriggerFormSection>
      </div>
    </div>
  </div>

  <div class="flex shrink-0 flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
    <Button type="button" variant="outline" onclick={onCancel} disabled={isPending}>
      {t(triggersMessages.cancel)}
    </Button>
    <span class="contents" data-tour="trigger-submit">
      <Button type="button" onclick={() => void handleSubmit()} disabled={!isValid || isPending}>
        {isEdit ? t(triggersMessages.save) : t(triggersMessages.create)}
      </Button>
    </span>
  </div>
</div>
