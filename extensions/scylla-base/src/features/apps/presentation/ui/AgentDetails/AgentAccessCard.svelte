<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import { createMutation } from '@scylla/core-sdk';
  import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Skeleton,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    runnerChanges,
    type AgentAccess,
  } from '@base/features/apps/domain/structs/agent-access.struct.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import ProjectChooser from '../components/ProjectChooser/ProjectChooser.svelte';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    agentId: string;
    workspaceId: string;
    workspaceName: string;
    /** `undefined` while it loads. */
    access: AgentAccess | undefined;
    /** `grant` and `revoke` on the workspace and its projects. */
    canChange: boolean;
  }

  let { agentId, workspaceId, workspaceName, access, canChange }: Props = $props();

  const change = createMutation(() => appMutations.changeAccess(workspaceId));

  let open = $state(false);
  let someProjects = $state(false);
  let projectIds = $state<string[]>([]);

  const start = () => {
    someProjects = access?.kind !== 'all';
    projectIds = access?.kind === 'some' ? access.projects.map(project => project.id) : [];
    open = true;
  };

  const save = () => {
    if (!access) return;
    const changes = runnerChanges(access, { all: !someProjects, projectIds });
    if (changes.length === 0) {
      open = false;
      return;
    }
    change.mutate({ appId: agentId, changes }, { onSuccess: () => (open = false) });
  };
</script>

<Card class="h-full">
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle><h2>{t(messages.access)}</h2></CardTitle>
    {#if canChange && access}
      <Button variant="outline" size="sm" onclick={start}>{t(messages.change)}</Button>
    {/if}
  </CardHeader>
  <CardContent class="flex flex-col gap-3 text-sm">
    {#if !access}
      <Skeleton class="h-5 w-40" />
    {:else if access.kind === 'all'}
      <p class="flex items-center gap-2">
        <FolderIcon class="size-4" aria-hidden="true" />
        {t(messages.allProjectsOf(workspaceName))}
      </p>
      <p class="text-xs text-muted-foreground">{t(messages.allBody)}</p>
    {:else if access.kind === 'some'}
      <ul class="flex flex-col gap-2">
        {#each access.projects as project (project.id)}
          <li class="flex items-center gap-2">
            <FolderIcon class="size-4" aria-hidden="true" />
            {project.name}
          </li>
        {/each}
      </ul>
      <p class="text-xs text-muted-foreground">{t(messages.someBody)}</p>
    {:else}
      <p
        class="flex items-center gap-2 rounded-lg border border-warning/60 bg-warning/10 px-3 py-2"
        role="status"
      >
        <FolderIcon class="size-4 shrink-0" aria-hidden="true" />
        {t(messages.noAccess)}
      </p>
      {#if canChange}
        <Button size="sm" class="self-start" onclick={start}>{t(messages.giveAccess)}</Button>
      {/if}
    {/if}
  </CardContent>
</Card>

<Dialog {open} onOpenChange={next => (open = next)}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{t(messages.changeTitle)}</DialogTitle>
    </DialogHeader>
    <ProjectChooser
      {workspaceId}
      bind:someProjects
      bind:projectIds
      hint={t(messages.changeHint)}
    />
    <DialogFooter>
      <Button variant="outline" onclick={() => (open = false)}>{t(messages.cancel)}</Button>
      <Button
        onclick={save}
        disabled={change.isPending || (someProjects && projectIds.length === 0)}
      >
        {t(messages.save)}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
