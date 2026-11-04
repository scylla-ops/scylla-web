<script lang="ts">
  import ZapIcon from '@lucide/svelte/icons/zap';
  import { ErrorState, SecretRevealDialog } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { CreatedTrigger } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
  import TriggerForm from '../TriggerForm.svelte';
  import { createTriggerEditorView } from './trigger-editor-view.state.svelte.ts';

  interface Props {
    pipelineId: string;
    /** Absent when creating. */
    triggerId?: string;
  }

  let { pipelineId, triggerId }: Props = $props();

  const editor = createTriggerEditorView(
    () => pipelineId,
    () => triggerId,
  );

  /** Held only while the dialog shows it. */
  let revealed = $state<{ name: string; secret: string } | null>(null);

  const handleSaved = (created?: CreatedTrigger) => {
    // Returned only once: reveal it now, and leave when it is closed.
    if (created?.webhookSecret) {
      revealed = { name: created.trigger.name, secret: created.webhookSecret };
      return;
    }
    editor.leave();
  };

  const closeSecret = () => {
    revealed = null;
    editor.leave();
  };
</script>

<div class="flex h-full min-h-0 w-full flex-col gap-6">
  <header class="flex shrink-0 items-start gap-3">
    <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <ZapIcon class="size-5 text-primary" />
    </div>
    <div class="flex min-w-0 flex-col gap-1">
      <h1 class="text-2xl font-semibold">
        {editor.isEdit ? t(triggersMessages.editTrigger) : t(triggersMessages.newTrigger)}
      </h1>
      <p class="text-sm text-muted-foreground">{t(triggersMessages.formDescription)}</p>
    </div>
  </header>

  {#if editor.isLoading}
    <Skeleton class="h-96 w-full rounded-xl" />
  {:else if editor.isUnavailable}
    <ErrorState message={t(triggersMessages.triggerNotFound)} />
  {:else}
    <TriggerForm
      {pipelineId}
      trigger={editor.trigger ?? undefined}
      onCancel={editor.leave}
      onSaved={handleSaved}
    />
  {/if}

  {#if revealed}
    <SecretRevealDialog
      open
      title={t(triggersMessages.webhookSecretOf(revealed.name))}
      description={t(triggersMessages.copySecretOnce)}
      secret={revealed.secret}
      secretLabel="Secret"
      revealedNote={t(triggersMessages.addSigningSecret)}
      onClose={closeSecret}
    />
  {/if}
</div>
