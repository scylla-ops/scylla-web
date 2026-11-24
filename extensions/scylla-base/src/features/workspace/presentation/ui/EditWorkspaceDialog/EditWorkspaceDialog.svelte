<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import {
    FormDialog,
    FormItemType,
    type FormItem,
    type FormValues,
  } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    workspaceMutations,
  } from '@base/features/workspace/presentation/workspace.queries.ts';
  import { workspaceMessages } from '@base/features/workspace/presentation/messages/workspace.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    workspace: { id: string; name: string; slug: string };
  }

  let { open, setOpen, workspace }: Props = $props();

  const updateWorkspace = createMutation(() => workspaceMutations.update());

  const items: readonly FormItem<'name' | 'slug'>[] = $derived([
    {
      id: 'name',
      label: t(workspaceMessages.workspaceName),
      placeholder: workspace.name,
      type: FormItemType.Input,
      inputType: 'text',
      optional: true,
    },
    {
      id: 'slug',
      label: t(workspaceMessages.slug),
      placeholder: workspace.slug,
      type: FormItemType.Input,
      inputType: 'text',
      optional: true,
    },
  ]);

  // Empty means "leave it alone": placeholders, not default values.
  const handleSubmit = ({ name, slug }: FormValues<'name' | 'slug'>) => {
    const newName = name.trim() || undefined;
    const newSlug = slug.trim() || undefined;
    if (!newName && !newSlug) {
      setOpen(false);
      return;
    }
    updateWorkspace.mutate(
      { workspaceId: workspace.id, name: newName, slug: newSlug },
      { onSuccess: () => setOpen(false) },
    );
  };
</script>

<FormDialog
  {open}
  onOpenChange={setOpen}
  title={t(workspaceMessages.editTitle)}
  description={t(workspaceMessages.editDescription)}
  {items}
  isPending={updateWorkspace.isPending}
  submitLabel={t(workspaceMessages.save)}
  pendingLabel={t(workspaceMessages.saving)}
  onSubmit={handleSubmit}
/>
