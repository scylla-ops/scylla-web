<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { FormItemType, ScyllaForm, type FormItem, type FormValues } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';
  import GroupColorField from '../GroupColor/GroupColorField.svelte';

  interface Props {
    /** The project that moves into the new group. */
    project: ProjectEntity;
    close: () => void;
  }

  let { project, close }: Props = $props();

  const createGroup = createMutation(() => projectGroupMutations.createWith());
  let color = $state<string | undefined>();

  const items: readonly FormItem<'name'>[] = $derived([
    {
      id: 'name',
      label: t(projectMessages.groupName),
      placeholder: t(projectMessages.groupNamePlaceholder),
      type: FormItemType.Input,
      inputType: 'text',
    },
  ]);

  // The color goes in the same create as the name, as in the « New group » row of the page.
  const handleSubmit = ({ name }: FormValues<'name'>) =>
    createGroup.mutate({ project, name, color }, { onSuccess: close });
</script>

<ScyllaForm {items} isPending={createGroup.isPending} onSubmit={handleSubmit}>
  {#snippet leading()}
    <GroupColorField value={color} onchange={next => (color = next)} disabled={createGroup.isPending} />
  {/snippet}
  {#snippet footer({ isValid, isPending })}
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        data-dialog-dismiss
        onclick={close}
        disabled={isPending}
      >
        {t(projectMessages.cancel)}
      </Button>
      <Button type="submit" disabled={!isValid || isPending}>
        {t(projectMessages.create)}
      </Button>
    </DialogFooter>
  {/snippet}
</ScyllaForm>
