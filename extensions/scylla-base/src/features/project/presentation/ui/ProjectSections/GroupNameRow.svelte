<script lang="ts">
  import { untrack } from 'svelte';
  import { Button, Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import GroupColorButton from '../GroupColor/GroupColorButton.svelte';

  interface Props {
    /** The name of the group to rename. Unset: a new group. */
    initial?: string;
    /** The color of the folder of the group to rename. */
    initialColor?: string;
    busy: boolean;
    /** The name, and the color of the folder (unset: the default folder). */
    onSubmit: (name: string, color: string | undefined) => void;
    onCancel: () => void;
  }

  let { initial, initialColor, busy, onSubmit, onCancel }: Props = $props();

  // The field starts on the name of the group, then follows what the person types. The folder
  // starts on its color: a click on it opens the colors, in the same row as the name.
  let name = $state(untrack(() => initial) ?? '');
  let color = $state(untrack(() => initialColor));
  const renames = $derived(initial !== undefined);
  const valid = $derived(
    name.trim().length > 0 && (name.trim() !== initial || color !== initialColor),
  );

  const focus = (input: HTMLInputElement) => {
    input.focus();
    input.select();
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (valid && !busy) onSubmit(name, color);
  };

  // Escape here closes the row only, not the reorder mode.
  const onkeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onCancel();
  };
</script>

<form class="flex min-h-8 flex-wrap items-center gap-2" onsubmit={submit} data-part="group-name-row">
  <GroupColorButton
    value={color}
    onchange={next => (color = next)}
    label={t(
      renames
        ? projectMessages.changeFolderColor(initial ?? '')
        : projectMessages.folderColorOfNew,
    )}
    disabled={busy}
  />
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
