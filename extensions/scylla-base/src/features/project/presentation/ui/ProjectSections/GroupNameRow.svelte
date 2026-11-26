<script lang="ts">
  import { untrack } from 'svelte';
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import { Button, Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';

  interface Props {
    /** The name of the group to rename. Unset: a new group. */
    initial?: string;
    busy: boolean;
    onSubmit: (name: string) => void;
    onCancel: () => void;
  }

  let { initial, busy, onSubmit, onCancel }: Props = $props();

  // The field starts on the name of the group, then follows what the person types.
  let name = $state(untrack(() => initial) ?? '');
  const renames = $derived(initial !== undefined);
  const Icon = $derived(renames ? PencilIcon : FolderPlusIcon);
  const valid = $derived(name.trim().length > 0 && name.trim() !== initial);

  const focus = (input: HTMLInputElement) => {
    input.focus();
    input.select();
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (valid && !busy) onSubmit(name);
  };

  // Escape here closes the row only, not the reorder mode.
  const onkeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onCancel();
  };
</script>

<form class="flex min-h-8 flex-wrap items-center gap-2" onsubmit={submit} data-part="group-name-row">
  <Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  <Input
    bind:value={name}
    maxlength={100}
    placeholder={t(projectMessages.groupNamePlaceholder)}
    aria-label={t(projectMessages.groupName)}
    class="w-[280px] max-w-full"
    {onkeydown}
    {@attach focus}
  />
  <Button type="submit" size="sm" disabled={!valid || busy} aria-busy={busy || undefined}>
    {t(renames ? projectMessages.save : projectMessages.create)}
  </Button>
  <Button type="button" size="sm" variant="ghost" onclick={onCancel}>
    {t(projectMessages.cancel)}
  </Button>
  <span class="text-sm font-medium text-muted-foreground max-md:hidden">
    {t(renames ? projectMessages.renameHint : projectMessages.createHint)}
  </span>
</form>
