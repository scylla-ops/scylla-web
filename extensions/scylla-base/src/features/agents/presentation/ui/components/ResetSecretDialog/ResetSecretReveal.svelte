<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import InfoIcon from '@lucide/svelte/icons/info';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { ScyllaDialog } from '@scylla/ui';
  import { Badge, Button, DialogDescription, DialogTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
  import type {
    ResetOutcome,
  } from './reset-secret.state.svelte.ts';
  import { agentsMessages } from '@base/features/agents/presentation/messages/agents.messages.ts';
  import CopyBox from '../CopyBox/CopyBox.svelte';
  import DialogFooterBand from '../DialogFooterBand.svelte';
  import { resetSecretMessages as messages } from '@base/features/agents/presentation/messages/reset-secret.messages.ts';

  interface Props {
    agent: AgentEntity;
    secret: string;
    outcome: ResetOutcome;
    onDone: () => void;
  }

  let { agent, secret, outcome, onDone }: Props = $props();

  const outcomeText = $derived.by(() => {
    switch (outcome.kind) {
      case 'revoked':
        return outcome.labels.length === 1
          ? t(messages.revokedOne(outcome.labels[0]))
          : t(messages.revokedMany(outcome.labels.length));
      case 'kept':
        return outcome.labels.length === 1
          ? t(messages.keptOne(outcome.labels[0]))
          : t(messages.keptMany);
      case 'failed':
        return t(messages.revokeFailed);
      default:
        return null;
    }
  });
</script>

<!-- Only its close button and Done close it: a stray Escape must not lose the secret. -->
<ScyllaDialog
  open
  onOpenChange={open => {
    if (!open) onDone();
  }}
  dismissible="button"
  class="w-[calc(100vw-2rem)] gap-0 p-0 sm:max-w-[520px]"
>
  <div data-dialog-part="header" class="flex min-w-0 flex-col gap-2 px-6 pt-6 pr-12">
    <DialogTitle class="wrap-break-word">{t(messages.revealTitle(agent.name))}</DialogTitle>
    <DialogDescription>{t(messages.revealBody)}</DialogDescription>
  </div>

  <div data-dialog-part="body" class="flex min-w-0 flex-col gap-2 px-6 py-5">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">{t(messages.secret)}</span>
      <Badge variant="outline" class="font-normal">{t(agentsMessages.shownOneTime)}</Badge>
    </div>
    <CopyBox value={secret} {secret} copyToast={t(messages.secretCopied)} />
    <p class="text-xs text-muted-foreground">{t(messages.putSecret)}</p>

    {#if outcomeText}
      <p class="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
        {#if outcome.kind === 'revoked'}
          <CircleCheckIcon class="size-4 shrink-0 text-success" />
        {:else if outcome.kind === 'failed'}
          <TriangleAlertIcon class="size-4 shrink-0 text-warning" />
        {:else}
          <InfoIcon class="size-4 shrink-0 text-muted-foreground" />
        {/if}
        {outcomeText}
      </p>
    {/if}
  </div>

  <DialogFooterBand note={t(agentsMessages.noSecondChance)}>
    <Button onclick={onDone}>{t(messages.done)}</Button>
  </DialogFooterBand>
</ScyllaDialog>
