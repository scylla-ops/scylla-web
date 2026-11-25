<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { isCronExpressionValid } from '@base/features/triggers/domain/structs/cron-expression.struct.ts';
  import { buildTriggerDraft } from '@base/features/triggers/presentation/mappers/trigger-form.mapper.ts';
  import { triggerPanelMessages } from '@base/features/triggers/presentation/messages/trigger-panel.messages.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
  import { triggerMutations } from '@base/features/triggers/presentation/triggers.queries.ts';
  import CronScheduleBuilder from '@base/features/triggers/presentation/ui/components/trigger-form/CronScheduleBuilder/CronScheduleBuilder.svelte';

  interface Props {
    pipelineId: string;
    /** A name that no trigger of the pipeline has. */
    defaultName: string;
    /** The schedule is created, or the user cancels. */
    onClose: () => void;
    /** The inputs of a schedule are in the full editor. */
    onFullEditor: () => void;
  }

  let { pipelineId, defaultName, onClose, onFullEditor }: Props = $props();

  // The default of the full editor: each day at 09:00, local time.
  const DEFAULT_CRON = '0 9 * * *';
  const id = $props.id();

  // svelte-ignore state_referenced_locally
  let name = $state(defaultName);
  let expression = $state(DEFAULT_CRON);

  const create = createMutation(() => triggerMutations.create(pipelineId));
  const valid = $derived(name.trim().length > 0 && isCronExpressionValid(expression));

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!valid || create.isPending) return;
    const draft = buildTriggerDraft({ name, kind: 'cron', cronExpression: expression, inputs: [] });
    create.mutate(draft, { onSuccess: onClose });
  };
</script>

<!-- A new schedule in the panel: a name and a time. The full editor adds the inputs. -->
<form
  class="mx-2 mt-2 flex flex-col gap-3 rounded-lg border bg-background p-3"
  aria-labelledby="{id}-title"
  onsubmit={submit}
>
  <h3 id="{id}-title" class="text-[13px]">{t(triggerPanelMessages.newSchedule)}</h3>
  <div class="flex flex-col gap-1.5">
    <Label for="{id}-name">{t(triggersMessages.name)}</Label>
    <Input id="{id}-name" bind:value={name} autocomplete="off" />
  </div>
  <CronScheduleBuilder initialValue={DEFAULT_CRON} onChange={value => (expression = value)} />
  <p class="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
    {t(triggerPanelMessages.fullEditorHint)}
    <Button
      type="button"
      variant="link"
      size="xs"
      class="h-auto p-0 text-xs"
      onclick={onFullEditor}
    >
      {t(triggerPanelMessages.openFullEditor)}
    </Button>
  </p>
  <div class="flex items-center justify-end gap-2">
    <Button type="button" variant="ghost" size="sm" onclick={onClose}>{t(triggersMessages.cancel)}</Button>
    <Button type="submit" size="sm" disabled={!valid || create.isPending}>
      {t(triggersMessages.create)}
    </Button>
  </div>
</form>
