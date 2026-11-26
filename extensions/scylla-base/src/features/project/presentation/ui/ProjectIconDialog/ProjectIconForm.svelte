<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { IconPicker, type IconChoice } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '../../messages/project.messages.ts';
  import {
    DEFAULT_PROJECT_GLYPH,
    iconChangeOf,
    projectIconChoice,
  } from '../../presenters/project-icon.presenter.ts';
  import { projectMutations } from '../../project.queries.ts';
  import { keepRecentColor, recentColors } from '../../recent-colors.user-state.ts';

  interface Props {
    project: ProjectEntity;
    /** The second line next to the preview, e.g. the linked repository. */
    subtitle?: string;
    close: () => void;
  }

  let { project, subtitle, close }: Props = $props();

  const setIcon = createMutation(() => projectMutations.setIcon());
  // svelte-ignore state_referenced_locally
  let choice = $state<IconChoice>(projectIconChoice(project.icon));
  const recent = recentColors();

  const save = async () => {
    const icon = await iconChangeOf(choice, project.icon);
    if (!icon) return close();
    setIcon.mutate(
      { projectId: project.id, icon },
      {
        onSuccess: () => {
          if (icon.kind === 'glyph') keepRecentColor(icon.color);
          close();
        },
      },
    );
  };
</script>

<IconPicker
  value={choice}
  onchange={next => (choice = next)}
  title={project.name}
  {subtitle}
  {recent}
  defaultGlyph={DEFAULT_PROJECT_GLYPH}
/>
<DialogFooter>
  <Button variant="outline" data-dialog-dismiss onclick={close}>
    {t(projectMessages.cancel)}
  </Button>
  <Button disabled={setIcon.isPending} aria-busy={setIcon.isPending || undefined} onclick={save}>
    {t(projectMessages.save)}
  </Button>
</DialogFooter>
