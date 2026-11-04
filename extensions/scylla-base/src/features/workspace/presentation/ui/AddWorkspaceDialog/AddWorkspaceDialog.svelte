<script lang="ts">
  import { navigateTo } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { FormDialog, type FormValues } from '@scylla/ui';
  import {
    activeLocale,
    t,
  } from '@scylla/ui/i18n';
  import {
    workspaceMutations,
  } from '@base/features/workspace/presentation/workspace.queries.ts';
  import {
    createWorkspaceItems,
  } from '@base/features/workspace/presentation/presenters/workspace-form.presenter.ts';
  import { workspaceMessages } from '@base/features/workspace/presentation/messages/workspace.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    hideCancel?: boolean;
  }

  let { open, setOpen, hideCancel = false }: Props = $props();

  const createWorkspace = createMutation(() => workspaceMutations.create());

  // Reading the locale rebuilds the labels on a switch.
  const items = $derived((activeLocale(), createWorkspaceItems()));

  const handleSubmit = ({ name, slug }: FormValues<'name' | 'slug'>) => {
    if (!name.trim()) return;

    createWorkspace.mutate(
      { name: name.trim(), slug: slug.trim() || undefined },
      {
        // The mutation already made it active; where to land is the caller's choice.
        onSuccess: workspace => {
          setOpen(false);
          navigateTo(`/${workspace.slug}/projects`);
        },
      },
    );
  };
</script>

<FormDialog
  {open}
  onOpenChange={setOpen}
  title={t(workspaceMessages.createTitle)}
  description={t(workspaceMessages.createDescription)}
  {items}
  isPending={createWorkspace.isPending}
  submitLabel={t(workspaceMessages.createSubmit)}
  onSubmit={handleSubmit}
  {hideCancel}
/>
