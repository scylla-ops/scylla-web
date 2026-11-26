<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import { can, Permission } from '@platform/authz';
  import { createQuery } from '@scylla/core-sdk';
  import { ColorGlyph, fold, unfold } from '@scylla/ui';
  import {
    Field,
    FieldLabel,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectGroupChoice } from '@base/features/project/domain/entities/project-group.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { projectGroupQueries } from '../../project-group.queries.ts';
  import GroupColorButton from '../GroupColor/GroupColorButton.svelte';

  interface Props {
    workspaceId: string;
    value: ProjectGroupChoice;
    onchange: (next: ProjectGroupChoice) => void;
    disabled?: boolean;
  }

  let { workspaceId, value, onchange, disabled = false }: Props = $props();

  const id = $props.id();
  // Values that no group id can be.
  const NONE = '\nnone';
  const NEW = '\nnew';

  const groups = createQuery(() => projectGroupQueries.list(workspaceId));
  const list = $derived(groups.data ?? []);
  // A new group is a change of the groups of the workspace.
  const canCreateGroup = $derived(can(Permission.UPDATE_PROJECT, { workspaceId }));
  const selected = $derived(value.kind === 'group' ? value.id : value.kind === 'new' ? NEW : NONE);
  const current = $derived(
    value.kind === 'group' ? list.find(group => group.id === value.id) : undefined,
  );

  const select = (next: string) => {
    if (next === selected) return;
    onchange(
      next === NEW
        ? { kind: 'new', name: '' }
        : next === NONE
          ? { kind: 'none' }
          : { kind: 'group', id: next },
    );
  };

  // The name field takes the focus after the select gives it back to its trigger.
  const focus = (input: HTMLInputElement) => {
    const timer = setTimeout(() => input.focus());
    return () => clearTimeout(timer);
  };
</script>

{#snippet folderOf(color: string | undefined)}
  <ColorGlyph icon={FolderIcon} {color} />
{/snippet}

<!-- The group of the project: no group, a group of the workspace with its folder, or a new one. -->
<Field class="gap-1" data-part="project-group-field">
  <FieldLabel for="{id}-group">{t(projectMessages.group)}</FieldLabel>
  <Select type="single" value={selected} onValueChange={select} {disabled}>
    <SelectTrigger id="{id}-group" class="w-full">
      <span class="flex min-w-0 items-center gap-2">
        {#if value.kind === 'new'}
          <FolderPlusIcon class="size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{t(projectMessages.newGroupMenu)}</span>
        {:else}
          {@render folderOf(current?.color)}
          <span class="truncate">
            {value.kind === 'group' ? (current?.name ?? '') : t(projectMessages.ungrouped)}
          </span>
        {/if}
      </span>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={NONE} label={t(projectMessages.ungrouped)}>
        {@render folderOf(undefined)}
        <span class="min-w-0 truncate">{t(projectMessages.ungrouped)}</span>
      </SelectItem>
      {#each list as group (group.id)}
        <SelectItem value={group.id} label={group.name}>
          {@render folderOf(group.color)}
          <span class="min-w-0 truncate">{group.name}</span>
        </SelectItem>
      {/each}
      {#if canCreateGroup}
        <SelectItem value={NEW} label={t(projectMessages.newGroupMenu)}>
          <FolderPlusIcon class="size-4" aria-hidden="true" />
          <span class="min-w-0 truncate">{t(projectMessages.newGroupMenu)}</span>
        </SelectItem>
      {/if}
    </SelectContent>
  </Select>
  {#if value.kind === 'new'}
    {@const draft = value}
    <!-- The folder and the name of the new group: it is created with the project. -->
    <div class="flex items-center gap-2 pt-1" data-part="project-new-group" in:unfold out:fold>
      <GroupColorButton
        value={draft.color}
        onchange={color => onchange({ ...draft, color })}
        label={t(projectMessages.folderColorOfNew)}
        {disabled}
      />
      <Input
        value={draft.name}
        oninput={event => onchange({ ...draft, name: event.currentTarget.value })}
        maxlength={100}
        placeholder={t(projectMessages.groupNamePlaceholder)}
        aria-label={t(projectMessages.newGroupName)}
        class="min-w-0 flex-1"
        {disabled}
        {@attach focus}
      />
    </div>
  {/if}
</Field>
