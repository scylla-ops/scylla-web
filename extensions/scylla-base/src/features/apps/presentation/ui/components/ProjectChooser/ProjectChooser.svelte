<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { Checkbox, Label, RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { projectQueries } from '@base/features/project';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    workspaceId: string;
    /** `true`: the list of the projects shows. */
    someProjects: boolean;
    projectIds: string[];
    /** Below the list. */
    hint?: string;
  }

  let {
    workspaceId,
    someProjects = $bindable(),
    projectIds = $bindable(),
    hint,
  }: Props = $props();

  const projects = createQuery(() => projectQueries.lookup(workspaceId));

  const choose = (projectId: string, chosen: boolean) => {
    projectIds = chosen ? [...projectIds, projectId] : projectIds.filter(id => id !== projectId);
  };
</script>

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
  {/if}
  {#if hint}
    <p class="text-xs text-muted-foreground">{hint}</p>
  {/if}
</fieldset>
