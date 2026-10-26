<script lang="ts">
  import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
    Button,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AppSecretEntity } from '@base/features/apps';
  import { createRenameSecret } from './rename-secret.state.svelte.ts';
  import AlertDialogCloseButton from '../AlertDialogCloseButton.svelte';
  import DialogFooterBand from '../DialogFooterBand.svelte';
  import SecretLabelField from '../SecretLabelField/SecretLabelField.svelte';
  import { renameSecretMessages as messages } from '@base/features/agents/presentation/messages/rename-secret.messages.ts';

  interface Props {
    /** Open while set. */
    secret: AppSecretEntity | null;
    /** Every secret of the agent: the others hold their labels. */
    secrets: readonly AppSecretEntity[];
    onClose: () => void;
  }

  let { secret, secrets, onClose }: Props = $props();

  const formId = $props.id();
  const rename = createRenameSecret(
    () => secret,
    () => secrets,
  );

  const close = () => {
    rename.clear();
    onClose();
  };
</script>

<AlertDialog
  open={secret !== null}
  onOpenChange={open => {
    if (!open && !rename.isPending) close();
  }}
>
  <AlertDialogContent class="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
    <AlertDialogCloseButton onclick={close} disabled={rename.isPending} />
    <div data-dialog-part="header" class="flex flex-col gap-2 px-6 pt-6 pr-12">
      <AlertDialogTitle>{t(messages.title(secret?.label ?? ''))}</AlertDialogTitle>
      <AlertDialogDescription>{t(messages.description)}</AlertDialogDescription>
    </div>
    <form
      id={formId}
      data-dialog-part="body"
      class="px-6 py-5"
      onsubmit={event => {
        event.preventDefault();
        rename.save(close);
      }}
    >
      <SecretLabelField
        input={rename.label}
        label={t(messages.name)}
        help={t(messages.nameHelp)}
        disabled={rename.isPending}
        autofocus
      />
    </form>
    <DialogFooterBand>
      <AlertDialogCancel class="mt-0" onclick={close} disabled={rename.isPending}>
        {t(messages.cancel)}
      </AlertDialogCancel>
      <Button type="submit" form={formId} disabled={!rename.canSave}>
        {t(messages.save)}
      </Button>
    </DialogFooterBand>
  </AlertDialogContent>
</AlertDialog>
