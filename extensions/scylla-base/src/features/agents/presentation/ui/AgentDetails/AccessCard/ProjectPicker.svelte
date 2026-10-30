<script lang="ts">
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import {
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AgentAccess } from './agent-access.state.svelte.ts';
  import { accessCardMessages as messages } from '@base/features/agents/presentation/messages/access-card.messages.ts';

  interface Props {
    manager: AgentAccess;
  }

  let { manager }: Props = $props();
</script>

{#if manager.projectsStatus === 'loading'}
  <p role="status" class="flex items-center gap-1.5 text-xs text-muted-foreground">
    <Loader2Icon class="size-3.5 animate-spin" aria-hidden="true" />
    {t(messages.projectsLoading)}
  </p>
{:else if manager.projectsStatus === 'error'}
  <div role="alert" class="flex items-center justify-between gap-2">
    <p class="text-xs text-destructive">{t(messages.projectsLoadError)}</p>
    <Button type="button" variant="outline" size="xs" onclick={manager.retryProjects}>
      {t(messages.retry)}
    </Button>
  </div>
{:else if manager.projectsStatus === 'denied'}
  <p class="text-xs text-muted-foreground italic">{t(messages.projectsDenied)}</p>
{:else if manager.canPickProject}
  <Select
    type="single"
    items={manager.projects.map(project => ({ value: project.id, label: project.name }))}
    value={manager.projectId ?? undefined}
    onValueChange={value => {
      manager.projectId = value;
      manager.reach = 'project';
    }}
    disabled={manager.working}
  >
    <SelectTrigger aria-label={t(messages.scopeProject)} class="mt-1.5 w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {#each manager.projects as project (project.id)}
        <SelectItem value={project.id} label={project.name}>{project.name}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
{:else}
  <p class="text-xs text-muted-foreground italic">
    {manager.projectsOutOfReach ? t(messages.projectsOutOfReach) : t(messages.noProjectLeft)}
  </p>
{/if}
{#if manager.projectsStatus === 'ready' && manager.projectsCut}
  <p class="text-xs text-muted-foreground">{t(messages.projectsCut(manager.projectsCut))}</p>
{/if}
