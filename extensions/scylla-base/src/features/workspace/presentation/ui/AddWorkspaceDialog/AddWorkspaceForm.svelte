<script lang="ts">
  import { navigateTo, workspaceUrl } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { IconField, ScyllaForm, type FormValues, type IconChoice } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { activeLocale, t } from '@scylla/ui/i18n';
  import { recentColors } from '@base/features/project';
  import { workspaceMutations } from '@base/features/workspace/presentation/workspace.queries.ts';
  import { createWorkspaceItems } from '@base/features/workspace/presentation/presenters/workspace-form.presenter.ts';
  import {
    DEFAULT_WORKSPACE_COLOR,
    DEFAULT_WORKSPACE_GLYPH,
    workspaceIconChange,
  } from '@base/features/workspace/presentation/presenters/workspace-icon.presenter.ts';
  import { workspaceMessages } from '@base/features/workspace/presentation/messages/workspace.messages.ts';

  interface Props {
    close: () => void;
    hideCancel?: boolean;
  }

  let { close, hideCancel = false }: Props = $props();

  const createWorkspace = createMutation(() => workspaceMutations.create());
  let icon = $state<IconChoice>({ kind: 'default' });
  const recent = recentColors();

  // Reading the locale rebuilds the labels on a switch.
  const items = $derived((activeLocale(), createWorkspaceItems()));

  const handleSubmit = async ({ name, slug }: FormValues<'name' | 'slug'>) => {
    if (!name.trim()) return;

    createWorkspace.mutate(
      {
        name: name.trim(),
        slug: slug.trim() || undefined,
        icon: await workspaceIconChange(icon, undefined),
      },
      {
        // The mutation already made it active; where to land is the caller's choice.
        onSuccess: workspace => {
          close();
          navigateTo(workspaceUrl(workspace.slug));
        },
      },
    );
  };
</script>

<ScyllaForm {items} isPending={createWorkspace.isPending} onSubmit={handleSubmit}>
  {#snippet leading()}
    <IconField
      value={icon}
      onchange={next => (icon = next)}
      {recent}
      defaultGlyph={DEFAULT_WORKSPACE_GLYPH}
      defaultColor={DEFAULT_WORKSPACE_COLOR}
      disabled={createWorkspace.isPending}
    />
  {/snippet}
  {#snippet footer({ isValid, isPending })}
    <DialogFooter>
      {#if !hideCancel}
        <Button
          type="button"
          variant="outline"
          data-dialog-dismiss
          onclick={close}
          disabled={isPending}
        >
          {t(workspaceMessages.cancel)}
        </Button>
      {/if}
      <Button type="submit" disabled={!isValid || isPending}>
        {isPending ? t(workspaceMessages.creating) : t(workspaceMessages.createSubmit)}
      </Button>
    </DialogFooter>
  {/snippet}
</ScyllaForm>
