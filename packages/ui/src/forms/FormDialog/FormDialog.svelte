<script lang="ts" generics="TId extends string">
  import { Button, DialogFooter } from '../../primitives/index.ts';
  import StableLabel from '../../controls/StableLabel/StableLabel.svelte';
  import ScyllaDialog from '../../feedback/ScyllaDialog/ScyllaDialog.svelte';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import ScyllaForm from '../ScyllaForm/ScyllaForm.svelte';
  import { formDialogMessages } from './form-dialog.messages.ts';
  import type { FormItem, FormValues } from '../scylla-form.struct.ts';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    items: readonly FormItem<TId>[];
    isPending?: boolean;
    submitLabel?: string;
    pendingLabel?: string;
    onSubmit: (values: FormValues<TId>) => void;
    hideCancel?: boolean;
  }

  let {
    open,
    onOpenChange,
    title,
    description,
    items,
    isPending = false,
    submitLabel,
    pendingLabel,
    onSubmit,
    hideCancel = false,
  }: Props = $props();

  const idleLabel = $derived(submitLabel ?? t(formDialogMessages.create));
  const busyLabel = $derived(pendingLabel ?? t(formDialogMessages.creating));
</script>

<ScyllaDialog {open} {onOpenChange} {title} {description} dismissible={!hideCancel}>
  <ScyllaForm {items} {isPending} {onSubmit}>
    {#snippet footer({ isValid, isPending: pending })}
      <DialogFooter>
        {#if !hideCancel}
          <Button
            type="button"
            variant="outline"
            data-dialog-dismiss
            onclick={() => onOpenChange(false)}
            disabled={pending}
          >
            {t(formDialogMessages.cancel)}
          </Button>
        {/if}
        <!-- The button keeps the width of its longer label: Cancel does not move at the submit. -->
        <Button type="submit" disabled={!isValid || pending}>
          <StableLabel text={pending ? busyLabel : idleLabel} reserve={[idleLabel, busyLabel]} />
        </Button>
      </DialogFooter>
    {/snippet}
  </ScyllaForm>
</ScyllaDialog>
