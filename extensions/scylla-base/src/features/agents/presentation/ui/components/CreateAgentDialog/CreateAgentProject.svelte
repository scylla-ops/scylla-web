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
  import type { AgentCreation } from '@base/features/agents/presentation/create-agent.state.svelte.ts';
  import { createAgentMessages as messages } from './create-agent.messages.ts';

  interface Props {
    creation: AgentCreation;
    disabled: boolean;
  }

  let { creation, disabled }: Props = $props();
</script>

{#if creation.projectOption === 'loading'}
  <p role="status" class="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
    <Loader2Icon class="size-3.5 animate-spin" aria-hidden="true" />
    {t(messages.projectsLoading)}
  </p>
{:else if creation.projectOption === 'error'}
  <div role="alert" class="mt-1.5 flex items-center justify-between gap-2">
    <p class="text-xs text-destructive">{t(messages.projectsLoadError)}</p>
    <Button type="button" variant="outline" size="xs" onclick={creation.retryProjects} {disabled}>
      {t(messages.retry)}
    </Button>
  </div>
{:else}
  <Select
    type="single"
    items={creation.projects.map(project => ({ value: project.id, label: project.name }))}
    value={creation.projectId ?? undefined}
    onValueChange={value => {
      creation.projectId = value;
      creation.reach = 'project';
    }}
    {disabled}
  >
    <SelectTrigger aria-label={t(messages.project)} class="mt-1.5 w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {#each creation.projects as project (project.id)}
        <SelectItem value={project.id} label={project.name}>{project.name}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
{/if}
