<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import { i18n } from '@lingui/core';
  import { activeWorkspaceSlug, contextStore, scyllaNavigate } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { FormItemType, ScyllaForm, type FormItem, type FormValues } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { toast } from '@scylla/ui/utils';
  import { ToastMessages } from '@shared/utils/toast-messages.ts';
  import { projectMessages as messages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { projectMutations } from '@base/features/project/presentation/project.queries.ts';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const backHref = $derived(`/${context().workspace.slug ?? activeWorkspaceSlug() ?? ''}/projects/new`);

  const createProject = createMutation(() => projectMutations.create());

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
      type: FormItemType.Input,
      inputType: 'text',
      optional: true,
    },
  ]);

  const submit = ({ name, description }: FormValues<'name' | 'description'>) => {
    // A project needs a workspace: the toast says so.
    if (!name.trim() || !workspaceId) {
      toast.error(i18n._(ToastMessages.PROJECT_NAME_REQUIRED_ERROR));
      return;
    }
    createProject.mutate(
      { name: name.trim(), workspaceId, description: description.trim() || undefined },
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
    {#snippet footer({ isValid, isPending })}
      <div class="flex items-center justify-between gap-2 pt-2">
        <Button href={backHref} variant="outline">
          <ArrowLeftIcon aria-hidden="true" />
          {t(messages.back)}
        </Button>
        <Button type="submit" disabled={!isValid || isPending}>{t(messages.createSubmit)}</Button>
      </div>
    {/snippet}
  </ScyllaForm>
</div>
