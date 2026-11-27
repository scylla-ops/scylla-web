<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import { i18n } from '@lingui/core';
  import {
    activeWorkspaceSlug,
    contextStore,
    currentSearch,
    scyllaNavigate,
  } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import {
    FormItemType,
    IconField,
    ScyllaForm,
    type FormItem,
    type FormValues,
    type IconChoice,
  } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { toast } from '@scylla/ui/utils';
  import { ToastMessages } from '@shared/utils/toast-messages.ts';
  import {
    groupChoiceComplete,
    groupChoiceOf,
    type ProjectGroupChoice,
  } from '@base/features/project/domain/entities/project-group.entity.ts';
  import { projectMessages as messages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    DEFAULT_PROJECT_GLYPH,
    iconChangeOf,
  } from '@base/features/project/presentation/presenters/project-icon.presenter.ts';
  import {
    newProjectGroupIn,
    withNewProjectGroup,
  } from '@base/features/project/presentation/presenters/new-project.presenter.ts';
  import { projectMutations } from '@base/features/project/presentation/project.queries.ts';
  import { recentColors } from '@base/features/project/presentation/recent-colors.user-state.ts';
  import GroupField from '../GroupField/GroupField.svelte';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  // The group of the button that opened the page: « New project » of a group, its "+" or its card.
  const groupId = newProjectGroupIn(currentSearch());
  const backHref = $derived(
    withNewProjectGroup(
      `/${context().workspace.slug ?? activeWorkspaceSlug() ?? ''}/projects/new`,
      groupId,
    ),
  );

  const createProject = createMutation(() => projectMutations.create());
  let icon = $state<IconChoice>({ kind: 'default' });
  let group = $state<ProjectGroupChoice>(groupChoiceOf(groupId));
  const recent = recentColors();

  const items: readonly FormItem<'name' | 'description'>[] = $derived([
    {
      id: 'name',
      label: t(messages.projectName),
      placeholder: t(messages.projectNamePlaceholder),
      type: FormItemType.Input,
      inputType: 'text',
    },
    {
      id: 'description',
      label: t(messages.description),
      placeholder: t(messages.descriptionPlaceholder),
      type: FormItemType.Textarea,
      maxLength: 1024,
      optional: true,
    },
  ]);

  const submit = async ({ name, description }: FormValues<'name' | 'description'>) => {
    // A project needs a workspace: the toast says so.
    if (!name.trim() || !workspaceId) {
      toast.error(i18n._(ToastMessages.PROJECT_NAME_REQUIRED_ERROR));
      return;
    }
    createProject.mutate(
      {
        name: name.trim(),
        workspaceId,
        description: description.trim() || undefined,
        icon: await iconChangeOf(icon, undefined),
        group,
      },
      { onSuccess: () => scyllaNavigate.goToWorkspaceRoute('/projects') },
    );
  };
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6" data-tour="add-project-form">
  <header class="flex flex-col gap-1">
    <p class="text-xs font-medium text-muted-foreground">{t(messages.regularStep)}</p>
    <h1>{t(messages.nameTitle)}</h1>
    <p class="text-sm text-muted-foreground">{t(messages.regularDescription)}</p>
  </header>

  <ScyllaForm
    {items}
    class="gap-4 rounded-xl border bg-card p-5"
    isPending={createProject.isPending}
    onSubmit={submit}
  >
    {#snippet leading()}
      <IconField
        value={icon}
        onchange={next => (icon = next)}
        {recent}
        defaultGlyph={DEFAULT_PROJECT_GLYPH}
        disabled={createProject.isPending}
      />
    {/snippet}
    {#snippet trailing()}
      {#if workspaceId}
        <GroupField
          {workspaceId}
          value={group}
          onchange={next => (group = next)}
          disabled={createProject.isPending}
        />
      {/if}
    {/snippet}
    {#snippet footer({ isValid, isPending })}
      <div class="flex items-center justify-between gap-2 pt-2">
        <Button href={backHref} variant="outline">
          <ArrowLeftIcon aria-hidden="true" />
          {t(messages.back)}
        </Button>
        <Button type="submit" disabled={!isValid || isPending || !groupChoiceComplete(group)}>
          {t(messages.createSubmit)}
        </Button>
      </div>
    {/snippet}
  </ScyllaForm>
</div>
