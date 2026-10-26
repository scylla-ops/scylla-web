<script lang="ts">
  import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
    Button,
    Checkbox,
    Label,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
  import { createResetSecret } from './reset-secret.state.svelte.ts';
  import { agentsMessages } from '@base/features/agents/presentation/messages/agents.messages.ts';
  import AlertDialogCloseButton from '../AlertDialogCloseButton.svelte';
  import DialogFooterBand from '../DialogFooterBand.svelte';
  import SecretLabelField from '../SecretLabelField/SecretLabelField.svelte';
  import ResetSecretReveal from './ResetSecretReveal.svelte';
  import { resetSecretMessages as messages } from '@base/features/agents/presentation/messages/reset-secret.messages.ts';

  interface Props {
    /** Open while set. */
    agent: AgentEntity | null;
    onClose: () => void;
  }

  let { agent, onClose }: Props = $props();

  const reset = createResetSecret(() => agent);
  const formId = $props.id();

  const secrets = $derived(reset.secrets);
  const keepHint = $derived(
    secrets.length === 1 ? messages.keepOne(secrets[0].label) : messages.keepMany,
  );

  const close = () => {
    reset.clear();
    onClose();
  };
</script>

<AlertDialog
  open={agent !== null && reset.result === null}
  onOpenChange={open => {
    if (!open && !reset.isPending) close();
  }}
>
  <AlertDialogContent class="gap-0 overflow-hidden p-0 sm:max-w-[520px]">
    <AlertDialogCloseButton onclick={close} disabled={reset.isPending} />
    <div data-dialog-part="header" class="flex flex-col gap-2 px-6 pt-6 pr-12">
      <AlertDialogTitle>{t(messages.title(agent?.name ?? ''))}</AlertDialogTitle>
      <AlertDialogDescription>{t(messages.description)}</AlertDialogDescription>
    </div>
    <form
      id={formId}
      data-dialog-part="body"
      class="flex flex-col gap-5 px-6 py-5"
      onsubmit={event => {
        event.preventDefault();
        reset.confirm();
      }}
    >
      <SecretLabelField
        input={reset.label}
        label={t(messages.newSecretName)}
        help={t(messages.newSecretNameHelp)}
        disabled={reset.isPending}
      />
      <div class="flex items-start gap-2.5">
        <Checkbox
          id="reset-secret-revoke"
          class="mt-0.5"
          checked={reset.revokeOthers}
          onCheckedChange={checked => (reset.revokeOthers = checked)}
          disabled={reset.isPending}
        />
        <div class="flex flex-col gap-1">
          <Label for="reset-secret-revoke" class="text-sm font-medium">
            {t(messages.revokeNow)}
          </Label>
          <p class="text-sm text-muted-foreground">
            {#if reset.revokeOthers}
              {t(messages.revokeOn)}
              {#if secrets.length > 0}{t(keepHint)}{/if}
            {:else}
              {t(messages.revokeOff)}
            {/if}
          </p>
        </div>
      </div>
    </form>
    <DialogFooterBand>
      <AlertDialogCancel class="mt-0" onclick={close} disabled={reset.isPending}>
        {t(messages.cancel)}
      </AlertDialogCancel>
      <Button type="submit" form={formId} disabled={!reset.canConfirm}>
        {t(agentsMessages.resetSecret)}
      </Button>
    </DialogFooterBand>
  </AlertDialogContent>
</AlertDialog>

{#if agent && reset.result && reset.outcome}
  <ResetSecretReveal
    {agent}
    secret={reset.result.created.secret}
    outcome={reset.outcome}
    onDone={close}
  />
{/if}
