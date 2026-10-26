<script lang="ts">
  import type { Snippet } from 'svelte';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import { MediaQuery } from 'svelte/reactivity';
  import { Button } from '../../primitives/index.ts';
  import type { LucideIcon } from '../../icon.ts';
  import { toast } from '../../utils/toast.ts';
  import { activeLocale, t } from '../../i18n/lingui.adapter.svelte.ts';
  // Not the group barrels: they would import this file back.
  import GatedButton from '../../controls/GatedButton/GatedButton.svelte';
  import ConfirmOperationAlertDialog from '../../feedback/ConfirmOperationAlertDialog/ConfirmOperationAlertDialog.svelte';
  import { featureHeaderMessages } from './feature-header.messages.ts';

  interface Props {
    count?: number;
    label: string;
    underLabel?: Snippet;
    pluralLabel?: string;
    selectedCount?: number;
    /** Hides "Select all". */
    allSelected?: boolean;
    onSelectAll?: () => void;
    onClearSelection?: () => void;
    onDeleteSelection?: () => Promise<void> | void;
    onNew?: () => void;
    newLabel?: string;
    /** Before the label of "New". On a phone it stands alone, a plus by default. */
    newIcon?: LucideIcon;
    /** False disables "New" and shows `newDeniedReason`. */
    canNew?: boolean;
    newDeniedReason?: string;
    /** False disables the bulk delete and shows `deleteDeniedReason`. */
    canDelete?: boolean;
    deleteDeniedReason?: string;
    extraActions?: Snippet;
  }

  let {
    count,
    label,
    underLabel,
    pluralLabel,
    selectedCount = 0,
    allSelected = false,
    onSelectAll,
    onClearSelection,
    onDeleteSelection,
    onNew,
    newLabel,
    newIcon: NewIcon,
    canNew = true,
    newDeniedReason,
    canDelete = true,
    deleteDeniedReason,
    extraActions,
  }: Props = $props();

  let deleteDialogOpen = $state(false);

  // A phone: "New" becomes an icon, the selection actions a bar at the bottom of the screen.
  const phone = new MediaQuery('(max-width: 639px)');
  const PhoneNewIcon = $derived(NewIcon ?? PlusIcon);
  const showSelectionBar = $derived(
    phone.current && selectedCount > 0 && (!!onClearSelection || !!onDeleteSelection),
  );

  /** The plural rule of the locale: English says "0 roles", French "0 rôle". */
  const displayLabel = $derived(
    count !== undefined && new Intl.PluralRules(activeLocale()).select(count) !== 'one'
      ? (pluralLabel ?? label)
      : label,
  );
  const newButtonLabel = $derived(newLabel ?? t(featureHeaderMessages.newEntity(label)));

  const handleDelete = async () => {
    // The delete clears the selection, so `selectedCount` reads 0 once it resolves.
    const deleted = selectedCount;
    try {
      deleteDialogOpen = false;
      await onDeleteSelection?.();
      toast.success(t(featureHeaderMessages.itemsDeleted(deleted)));
    } catch {
      // The error toast comes from the global mutation handler.
      deleteDialogOpen = false;
    }
  };
</script>

{#snippet selectionActions(variant: 'outline' | 'ghost')}
  {@const onBar = variant === 'ghost'}
  {@const barButton = 'h-11 text-background hover:bg-background/10 hover:text-background'}
  {#if onSelectAll && !allSelected && !!count}
    <Button {variant} class={onBar ? barButton : undefined} onclick={onSelectAll}>
      {t(featureHeaderMessages.selectAll)}
    </Button>
  {/if}

  {#if selectedCount > 0 && onClearSelection}
    <Button {variant} class={onBar ? barButton : undefined} onclick={onClearSelection}>
      {t(featureHeaderMessages.clear)}
    </Button>
  {/if}

  {#if selectedCount > 0 && onDeleteSelection}
    <GatedButton
      allowed={canDelete}
      deniedReason={deleteDeniedReason}
      tooltip={t(featureHeaderMessages.delete)}
      size="icon"
      variant="destructive"
      onclick={() => (deleteDialogOpen = true)}
      class={onBar ? 'size-11' : 'h-9 w-9 cursor-pointer transition-all hover:scale-110'}
    >
      <TrashIcon class="size-4" />
      <span class="sr-only">{t(featureHeaderMessages.delete)}</span>
    </GatedButton>
  {/if}
{/snippet}

<div class="flex w-full flex-row flex-wrap items-end justify-between gap-x-4 gap-y-3">
  <div class="flex min-w-0 flex-col gap-2">
    <div class="flex flex-row flex-wrap gap-4">
      <div class="flex min-w-0 items-baseline gap-2">
        <h1 class="min-w-0 text-2xl font-bold tracking-tight break-words sm:text-3xl">
          {#if count !== undefined}<span class="mr-2 text-primary">{count}</span>{/if}
          <span class="text-foreground">{displayLabel}</span>
        </h1>
        {#if count !== undefined}
          <span class="text-sm font-medium whitespace-nowrap text-muted-foreground">
            {t(featureHeaderMessages.inTotal)}
          </span>
        {/if}
      </div>
    </div>
    {#if underLabel}{@render underLabel()}{/if}
  </div>

  <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
    {#if !phone.current}
      {@render selectionActions('outline')}
    {/if}

    {#if extraActions}{@render extraActions()}{/if}

    {#if onNew}
      <GatedButton
        allowed={canNew}
        deniedReason={newDeniedReason}
        onclick={onNew}
        size={phone.current ? 'icon' : 'default'}
        class={phone.current ? 'size-11' : undefined}
        data-part="feature-header-new"
      >
        {#if phone.current}
          <PhoneNewIcon class="size-5" />
          <span class="sr-only">{newButtonLabel}</span>
        {:else}
          {#if NewIcon}<NewIcon />{/if}
          {newButtonLabel}
        {/if}
      </GatedButton>
    {/if}
  </div>

  {#if showSelectionBar}
    <div
      data-part="feature-header-selection-bar"
      class="fixed inset-x-3 bottom-4 z-40 flex items-center gap-1 rounded-2xl bg-foreground py-1.5 pr-1.5 pl-4 text-background shadow-[0_12px_32px_-8px_oklch(0_0_0/0.35)]"
    >
      <span class="flex-1 text-sm font-semibold">
        {t(featureHeaderMessages.selected(selectedCount))}
      </span>
      {@render selectionActions('ghost')}
    </div>
  {/if}

  {#if onDeleteSelection}
    <ConfirmOperationAlertDialog
      open={deleteDialogOpen}
      onOpenChange={next => (deleteDialogOpen = next)}
      onContinue={handleDelete}
    />
  {/if}
</div>
