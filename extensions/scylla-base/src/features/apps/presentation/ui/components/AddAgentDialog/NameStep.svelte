<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import { createQuery } from '@scylla/core-sdk';
  import {
    Button,
    Checkbox,
    Input,
    Label,
    RadioGroup,
    RadioGroupItem,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { projectQueries } from '@base/features/project';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    workspaceId: string;
    name: string;
    /** Empty: each project of the workspace. */
    projectIds: string[];
    /** `true` once the user chose some projects: the list of projects shows. */
    someProjects: boolean;
  }

  let {
    workspaceId,
    name = $bindable(),
    projectIds = $bindable(),
    someProjects = $bindable(),
  }: Props = $props();

  let changing = $state(false);

  const projects = createQuery(() => projectQueries.lookup(workspaceId));

  const choose = (projectId: string, chosen: boolean) => {
    projectIds = chosen
      ? [...projectIds, projectId]
      : projectIds.filter(id => id !== projectId);
  };
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-1.5">
    <Label for="agent-name">{t(messages.name)}</Label>
    <Input
      id="agent-name"
      bind:value={name}
      placeholder={t(messages.namePlaceholder)}
      autocomplete="off"
    />
  </div>

  {#if !changing && !someProjects}
    <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span class="flex items-center gap-2">
        <FolderIcon class="size-4" aria-hidden="true" />
        {t(messages.allProjectsLine)}
      </span>
      <Button
        type="button"
        variant="link"
        size="sm"
        class="h-auto p-0"
        onclick={() => (changing = true)}
      >
        {t(messages.change)}
      </Button>
    </div>
  {:else}
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-medium">{t(messages.takesJobsFrom)}</legend>
      <RadioGroup
        value={someProjects ? 'some' : 'all'}
        onValueChange={value => (someProjects = value === 'some')}
      >
        <Label class="flex items-center gap-2 font-normal">
          <RadioGroupItem value="all" />
          {t(messages.allProjects)}
        </Label>
        <Label class="flex items-center gap-2 font-normal">
          <RadioGroupItem value="some" />
          {t(messages.someProjects)}
        </Label>
      </RadioGroup>
      {#if someProjects}
        <div class="max-h-48 overflow-y-auto rounded-md border px-3 py-1">
          {#each projects.data?.items ?? [] as project (project.id)}
            <Label class="flex items-center gap-2 py-1.5 font-normal">
              <Checkbox
                checked={projectIds.includes(project.id)}
                onCheckedChange={value => choose(project.id, value === true)}
              />
              {project.name}
            </Label>
          {:else}
            <p class="py-1.5 text-xs text-muted-foreground">{t(messages.noProject)}</p>
          {/each}
        </div>
        <p class="text-xs text-muted-foreground">{t(messages.someProjectsHint)}</p>
      {/if}
    </fieldset>
  {/if}
</div>
