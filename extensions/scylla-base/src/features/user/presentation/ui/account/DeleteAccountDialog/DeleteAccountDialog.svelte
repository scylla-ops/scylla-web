<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import ArchiveIcon from '@lucide/svelte/icons/archive';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import type { LucideIcon } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { FormItemType, ScyllaDialog, ScyllaForm, type FormItem } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { privacyMessages as m } from '@base/features/user/presentation/messages/privacy.messages.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isPending: boolean;
    /** The message of the server: a wrong password, or the workspaces to hand over first. */
    refusal?: string;
    onConfirm: (password: string) => void;
    /** The link to the export. Off where the account page cannot open, as the terms step. */
    withExportLink?: boolean;
  }

  let { open, onOpenChange, isPending, refusal, onConfirm, withExportLink = true }: Props =
    $props();

  const items: readonly FormItem<'password'>[] = $derived([
    {
      id: 'password',
      label: t(userMessages.password),
      type: FormItemType.Input,
      inputType: 'password',
      autocomplete: 'current-password',
    },
  ]);

  /** What the server deletes with the account (`delete_user` of the core), and what it keeps. */
  const DELETED = [m.deletedProfile, m.deletedSignIn, m.deletedTokens, m.deletedWorkspaces];
  const KEPT = [m.staysShared, m.staysWork];
</script>

<!-- A titled list of facts, each with its icon centered on its line. -->
{#snippet facts(title: MessageDescriptor, Icon: LucideIcon, lines: MessageDescriptor[])}
  <div class="flex flex-col gap-2">
    <h3 class="text-sm">{t(title)}</h3>
    <ul class="flex flex-col gap-1.5">
      {#each lines as fact (fact.id)}
        <li class="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon class="size-4 shrink-0" aria-hidden="true" />
          {t(fact)}
        </li>
      {/each}
    </ul>
  </div>
{/snippet}

<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(userMessages.deleteMyAccount)}
  description={t(m.deleteWarning)}
  dismissible={!isPending}
>
  <div class="flex flex-col gap-4 rounded-lg border bg-muted/40 p-4">
    {@render facts(m.deletedAtOnce, Trash2Icon, DELETED)}
    {@render facts(m.whatStays, ArchiveIcon, KEPT)}
  </div>
  {#if withExportLink}
    <!-- The dialog opens on `account/<section>`: the relative link goes to `account/privacy`. -->
    <a
      href="privacy"
      class="flex w-fit items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
      onclick={() => onOpenChange(false)}
    >
      <DownloadIcon class="size-4 shrink-0" aria-hidden="true" />
      {t(m.downloadFirst)}
    </a>
  {/if}
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
