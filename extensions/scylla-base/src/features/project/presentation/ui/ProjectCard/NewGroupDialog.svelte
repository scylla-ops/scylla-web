<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { FormDialog, FormItemType, type FormItem, type FormValues } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    /** The project that moves into the new group. */
    project: ProjectEntity;
  }

  let { open, setOpen, project }: Props = $props();

  const createGroup = createMutation(() => projectGroupMutations.createWith());

  const items: readonly FormItem<'name'>[] = $derived([
    {
      id: 'name',
      label: t(projectMessages.groupName),
      placeholder: t(projectMessages.groupNamePlaceholder),
      type: FormItemType.Input,
      inputType: 'text',
    },
  ]);

  const handleSubmit = ({ name }: FormValues<'name'>) =>
    createGroup.mutate({ project, name }, { onSuccess: () => setOpen(false) });
</script>

<FormDialog
  {open}
  onOpenChange={setOpen}
  title={t(projectMessages.newGroup)}
  description={t(projectMessages.newGroupDescription)}
  {items}
  isPending={createGroup.isPending}
  submitLabel={t(projectMessages.create)}
  onSubmit={handleSubmit}
/>
