<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import {
    FormItemType,
    IconField,
    ScyllaForm,
    StableLabel,
    type FormItem,
    type FormValues,
    type IconChoice,
  } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { recentColors } from '@base/features/project';
  import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
  import { workspaceMutations } from '@base/features/workspace/presentation/workspace.queries.ts';
  import {
    DEFAULT_WORKSPACE_COLOR,
    DEFAULT_WORKSPACE_GLYPH,
    workspaceIconChange,
    workspaceIconChoice,
  } from '@base/features/workspace/presentation/presenters/workspace-icon.presenter.ts';
  import { workspaceMessages } from '@base/features/workspace/presentation/messages/workspace.messages.ts';

  interface Props {
    workspace: Pick<WorkspaceEntity, 'id' | 'name' | 'slug' | 'icon'>;
    close: () => void;
  }

  let { workspace, close }: Props = $props();

  const updateWorkspace = createMutation(() => workspaceMutations.update());
  // svelte-ignore state_referenced_locally
  let icon = $state<IconChoice>(workspaceIconChoice(workspace.icon));
  const recent = recentColors();

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

  // Empty means "leave it alone": placeholders, not default values. The icon goes in the same save.
  const handleSubmit = async ({ name, slug }: FormValues<'name' | 'slug'>) => {
    const newName = name.trim() || undefined;
    const newSlug = slug.trim() || undefined;
    const newIcon = await workspaceIconChange(icon, workspace.icon);
    if (!newName && !newSlug && !newIcon) {
      close();
      return;
    }
    updateWorkspace.mutate(
      { workspaceId: workspace.id, name: newName, slug: newSlug, icon: newIcon },
      { onSuccess: close },
    );
  };
</script>

<ScyllaForm {items} isPending={updateWorkspace.isPending} onSubmit={handleSubmit}>
  {#snippet leading()}
    <IconField
      value={icon}
      onchange={next => (icon = next)}
      {recent}
      defaultGlyph={DEFAULT_WORKSPACE_GLYPH}
      defaultColor={DEFAULT_WORKSPACE_COLOR}
      disabled={updateWorkspace.isPending}
    />
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
        {t(workspaceMessages.cancel)}
      </Button>
      <Button type="submit" disabled={!isValid || isPending}>
        <StableLabel
          text={isPending ? t(workspaceMessages.saving) : t(workspaceMessages.save)}
          reserve={[t(workspaceMessages.save), t(workspaceMessages.saving)]}
        />
      </Button>
    </DialogFooter>
  {/snippet}
</ScyllaForm>
