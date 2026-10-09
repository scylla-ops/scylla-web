<script lang="ts">
  import { Button, DialogFooter } from '@scylla/ui/shadcn';
  import { FormItemType, ScyllaDialog, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { userMessages } from '../../user.messages.ts';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isPending: boolean;
    /** The message of the server: a wrong password, or the organizations to hand over first. */
    refusal?: string;
    onConfirm: (password: string) => void;
  }

  let { open, onOpenChange, isPending, refusal, onConfirm }: Props = $props();

  const items: readonly FormItem<'password'>[] = $derived([
    {
      id: 'password',
      label: t(userMessages.password),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'current-password',
    },
  ]);
</script>

<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(userMessages.deleteMyAccount)}
  description={t(userMessages.deleteMyAccountConfirm)}
  dismissible={!isPending}
>
  <ScyllaForm {items} {isPending} onSubmit={values => onConfirm(values.password)}>
    {#snippet footer({ isValid, isPending: pending })}
      {#if refusal}
        <p role="alert" class="text-sm text-destructive">{refusal}</p>
      {/if}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onclick={() => onOpenChange(false)}
        >
          {t(userMessages.cancel)}
        </Button>
        <Button type="submit" variant="destructive" disabled={!isValid || pending}>
          {t(userMessages.deleteMyAccount)}
        </Button>
      </DialogFooter>
    {/snippet}
  </ScyllaForm>
</ScyllaDialog>
