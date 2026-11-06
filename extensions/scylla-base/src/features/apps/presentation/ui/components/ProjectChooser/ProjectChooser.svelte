<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { Checkbox, Input, Label, RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { matchesSearch } from '@scylla/ui/utils';
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

  /** Below this, all the rows show at once. */
  const FILTER_FROM = 8;

  const projects = createQuery(() => projectQueries.lookup(workspaceId));
  const all = $derived(projects.data?.items ?? []);
  let filter = $state('');
  const shown = $derived(all.filter(project => matchesSearch(filter, [project.name])));

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
    {#if all.length >= FILTER_FROM}
      <Input
        placeholder={t(messages.findProject)}
        aria-label={t(messages.findProject)}
        autocomplete="off"
        bind:value={filter}
        onkeydown={event => {
          // The add-agent form holds this field: Enter must not send it.
          if (event.key === 'Enter') event.preventDefault();
        }}
      />
    {/if}
    <div class="relative max-h-48 overflow-y-auto rounded-md border px-3 py-1">
      {#each shown as project (project.id)}
        <Label class="flex items-center gap-2 py-1.5 font-normal">
          <Checkbox
            checked={projectIds.includes(project.id)}
            onCheckedChange={value => choose(project.id, value === true)}
          />
          {project.name}
        </Label>
      {:else}
        <p role="status" class="py-1.5 text-xs text-muted-foreground">
          {all.length === 0 ? t(messages.noProject) : t(messages.noProjectMatch)}
        </p>
      {/each}
    </div>
  {/if}
  {#if hint}
    <p class="text-xs text-muted-foreground">{hint}</p>
  {/if}
</fieldset>
