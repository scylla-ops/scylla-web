<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { IconPicker, type IconChoice } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { recentColors } from '@base/features/project';
  import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
  import { workspaceMessages } from '../../messages/workspace.messages.ts';
  import {
    DEFAULT_WORKSPACE_COLOR,
    DEFAULT_WORKSPACE_GLYPH,
    workspaceIconChange,
    workspaceIconChoice,
  } from '../../presenters/workspace-icon.presenter.ts';
  import { workspaceMutations } from '../../workspace.queries.ts';

  interface Props {
    workspace: Pick<WorkspaceEntity, 'id' | 'name' | 'slug' | 'icon'>;
    close: () => void;
  }

  let { workspace, close }: Props = $props();

  const setIcon = createMutation(() => workspaceMutations.setIcon());
  // svelte-ignore state_referenced_locally
  let choice = $state<IconChoice>(workspaceIconChoice(workspace.icon));
  const recent = recentColors();

  const save = async () => {
    const icon = await workspaceIconChange(choice, workspace.icon);
    if (!icon) return close();
    setIcon.mutate({ workspaceId: workspace.id, icon }, { onSuccess: close });
  };
</script>

<IconPicker
  value={choice}
  onchange={next => (choice = next)}
  title={workspace.name}
  subtitle={workspace.slug}
  {recent}
  defaultGlyph={DEFAULT_WORKSPACE_GLYPH}
  defaultColor={DEFAULT_WORKSPACE_COLOR}
/>
<DialogFooter>
  <Button variant="outline" data-dialog-dismiss onclick={close}>
    {t(workspaceMessages.cancel)}
  </Button>
  <Button disabled={setIcon.isPending} aria-busy={setIcon.isPending || undefined} onclick={save}>
    {t(workspaceMessages.save)}
  </Button>
</DialogFooter>
