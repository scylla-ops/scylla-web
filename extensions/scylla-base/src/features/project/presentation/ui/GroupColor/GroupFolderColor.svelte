<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { colorChange } from '../../presenters/group-color.presenter.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';
  import GroupColorButton from './GroupColorButton.svelte';

  interface Props {
    group: ProjectGroupEntity;
    /** The colors show. The menu of the group opens them. */
    open?: boolean;
    class?: string;
  }

  let { group, open = $bindable(false), class: className }: Props = $props();

  const update = createMutation(() => projectGroupMutations.update());
  // The folder shows each change at once; the color is saved when the colors close.
  let draft = $state<{ color: string | undefined } | null>(null);
  const shown = $derived(draft ? draft.color : group.color);

  const save = () => {
    if (!draft) return;
    const color = colorChange(draft.color, group.color);
    if (color === undefined) {
      draft = null;
      return;
    }
    update.mutate({ groupId: group.id, color }, { onSettled: () => (draft = null) });
  };
</script>

<GroupColorButton
  value={shown}
  onchange={color => (draft = { color })}
  onclose={save}
  label={t(projectMessages.changeFolderColor(group.name))}
  disabled={update.isPending}
  bind:open
  class={className}
/>
