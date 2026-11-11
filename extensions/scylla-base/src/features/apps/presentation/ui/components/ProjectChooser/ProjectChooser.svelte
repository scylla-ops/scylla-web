<script lang="ts">
  import SearchIcon from '@lucide/svelte/icons/search';
  import { createQuery } from '@scylla/core-sdk';
  import { Checkbox, Input, Label, RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn, matchesSearch } from '@scylla/ui/utils';
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

  const id = $props.id();
  const projects = createQuery(() => projectQueries.lookup(workspaceId));
  const all = $derived(projects.data?.items ?? []);
  const noProject = $derived(projects.isSuccess && all.length === 0);
  let filter = $state('');
  const shown = $derived(all.filter(project => matchesSearch(filter, [project.name])));

  const choices = $derived([
    { value: 'all', title: messages.allProjects, body: messages.allProjectsBody, disabled: false },
    {
      value: 'some',
      title: messages.someProjects,
      body: noProject ? messages.noProjectInWorkspace : messages.someProjectsBody,
      disabled: noProject && !someProjects,
    },
  ]);

  const choose = (projectId: string, chosen: boolean) => {
    projectIds = chosen ? [...projectIds, projectId] : projectIds.filter(item => item !== projectId);
  };
</script>

<fieldset class="flex flex-col gap-3">
  <legend class="mb-2 text-sm font-medium">{t(messages.takesJobsFrom)}</legend>
  <RadioGroup
    class="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-3"
    value={someProjects ? 'some' : 'all'}
    onValueChange={value => (someProjects = value === 'some')}
  >
    {#each choices as choice (choice.value)}
      {@const checked = (choice.value === 'some') === someProjects}
      <Label
        class={cn(
          'flex items-start gap-3 rounded-lg border p-3 font-normal transition-colors',
          checked ? 'border-primary bg-primary-subtle' : 'hover:bg-muted/50',
          choice.disabled
            ? 'cursor-not-allowed opacity-60 hover:bg-transparent'
            : 'cursor-pointer',
        )}
      >
        <span class="flex h-5 items-center">
          <RadioGroupItem
            value={choice.value}
            disabled={choice.disabled}
            aria-labelledby="{id}-{choice.value}"
            aria-describedby="{id}-{choice.value}-body"
          />
        </span>
        <span class="flex flex-col gap-0.5">
          <span id="{id}-{choice.value}" class="text-sm leading-5 font-medium">
            {t(choice.title)}
          </span>
          <span id="{id}-{choice.value}-body" class="text-xs text-muted-foreground">
            {t(choice.body)}
          </span>
        </span>
      </Label>
    {/each}
  </RadioGroup>
  {#if someProjects}
    {#if all.length >= FILTER_FROM}
      <div class="relative">
        <SearchIcon
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          class="pl-9"
          placeholder={t(messages.findProject)}
          aria-label={t(messages.findProject)}
          autocomplete="off"
          bind:value={filter}
          onkeydown={event => {
            // A form can hold this field: Enter must not send it.
            if (event.key === 'Enter') event.preventDefault();
          }}
        />
      </div>
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
        {#if all.length > 0}
          <p role="status" class="py-1.5 text-xs text-muted-foreground">
            {t(messages.noProjectMatch)}
          </p>
        {/if}
      {/each}
    </div>
  {/if}
  {#if hint}
    <p class="text-xs text-muted-foreground">{hint}</p>
  {/if}
</fieldset>
