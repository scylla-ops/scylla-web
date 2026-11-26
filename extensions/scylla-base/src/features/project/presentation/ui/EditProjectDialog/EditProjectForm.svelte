<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import {
    FormItemType,
    IconField,
    ScyllaForm,
    type FormItem,
    type FormValues,
    type IconChoice,
  } from '@scylla/ui';
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
  import { recentColors } from '../../recent-colors.user-state.ts';

  interface Props {
    project: ProjectEntity;
    close: () => void;
  }

  let { project, close }: Props = $props();

  const updateProject = createMutation(() => projectMutations.update());
  // svelte-ignore state_referenced_locally
  let icon = $state<IconChoice>(projectIconChoice(project.icon));
  const recent = recentColors();

  // Prefilled: Save is enabled on an untouched form.
  const items: readonly FormItem<'name' | 'description'>[] = $derived([
    {
      id: 'name',
      label: t(projectMessages.projectName),
      placeholder: project.name,
      defaultValue: project.name,
      type: FormItemType.Input,
      inputType: 'text',
    },
    {
      id: 'description',
      label: t(projectMessages.description),
      placeholder: project.description || t(projectMessages.addDescription),
      defaultValue: project.description,
      type: FormItemType.Input,
      inputType: 'text',
      optional: true,
    },
  ]);

  const submit = async ({ name, description }: FormValues<'name' | 'description'>) => {
    updateProject.mutate(
      {
        projectId: project.id,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        icon: await iconChangeOf(icon, project.icon),
      },
      { onSuccess: close },
    );
  };
</script>

<ScyllaForm {items} isPending={updateProject.isPending} onSubmit={submit}>
  {#snippet leading()}
    <IconField
      value={icon}
      onchange={next => (icon = next)}
      {recent}
      defaultGlyph={DEFAULT_PROJECT_GLYPH}
      disabled={updateProject.isPending}
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
        {t(projectMessages.cancel)}
      </Button>
      <Button type="submit" disabled={!isValid || isPending}>
        {isPending ? t(projectMessages.saving) : t(projectMessages.save)}
      </Button>
    </DialogFooter>
  {/snippet}
</ScyllaForm>
