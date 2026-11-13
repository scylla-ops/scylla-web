<script lang="ts">
  import GitPullRequestIcon from '@lucide/svelte/icons/git-pull-request';
  import UserIcon from '@lucide/svelte/icons/user';
  import XIcon from '@lucide/svelte/icons/x';
  import { SearchSelect } from '@scylla/ui';
  import {
    Button,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { JobEvent } from '@base/features/jobs';
  import type { GitRef } from '@base/features/integrations';
  import { runMessages } from '@base/features/pipeline/presentation/messages/run.messages.ts';
  import {
    ALL_BRANCHES,
    JOB_EVENTS,
    branchFilterOptions,
    jobEventLabel,
  } from '@base/features/pipeline/presentation/presenters/job-filter.presenter.ts';
  import type { JobFilters } from './job-filters.state.svelte.ts';

  interface Props {
    filters: JobFilters;
    /** The refs of the linked repository: the branches are the rows of the branch filter. */
    refs: readonly GitRef[];
    loading?: boolean;
  }

  let { filters, refs, loading = false }: Props = $props();

  const ALL_EVENTS = 'all';

  /** A text field applies its value on change, and on Enter: one request, not one per key. */
  const onEnter = (apply: (value: string) => void) => (event: KeyboardEvent) => {
    if (event.key === 'Enter') apply((event.currentTarget as HTMLInputElement).value);
  };
  const branchOptions = $derived(branchFilterOptions(refs));
</script>

<div role="group" aria-label={t(runMessages.filters)} class="flex flex-wrap items-center gap-2">
  <SearchSelect
    class="w-48"
    aria-label={t(runMessages.branch)}
    placeholder={t(runMessages.allBranches)}
    options={branchOptions}
    value={filters.branch}
    onValueChange={value => filters.setBranch(value === ALL_BRANCHES ? '' : value)}
    {loading}
  />

  <Select
    type="single"
    value={filters.event ?? ALL_EVENTS}
    onValueChange={value => filters.setEvent(value === ALL_EVENTS ? null : (value as JobEvent))}
  >
    <SelectTrigger aria-label={t(runMessages.event)} class="w-48">
      <SelectValue>
        {filters.event ? jobEventLabel(filters.event) : t(runMessages.allEvents)}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL_EVENTS} label={t(runMessages.allEvents)}>
        {t(runMessages.allEvents)}
      </SelectItem>
      {#each JOB_EVENTS as event (event)}
        <SelectItem value={event} label={jobEventLabel(event)}>{jobEventLabel(event)}</SelectItem>
      {/each}
    </SelectContent>
  </Select>

  <div class="relative w-48">
    <UserIcon
      class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
    <Input
      class="pl-9"
      aria-label={t(runMessages.author)}
      placeholder={t(runMessages.author)}
      autocomplete="off"
      value={filters.author}
      onchange={event => filters.setAuthor(event.currentTarget.value)}
      onkeydown={onEnter(value => filters.setAuthor(value))}
    />
  </div>

  <div class="relative w-40">
    <GitPullRequestIcon
      class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
    <Input
      class="pl-9"
      type="number"
      min="1"
      inputmode="numeric"
      aria-label={t(runMessages.pullRequest)}
      placeholder={t(runMessages.pullRequest)}
      value={filters.pullRequest}
      onchange={event => filters.setPullRequest(event.currentTarget.value)}
      onkeydown={onEnter(value => filters.setPullRequest(value))}
    />
  </div>

  {#if filters.active}
    <Button variant="ghost" size="sm" onclick={() => filters.clear()}>
      <XIcon />
      {t(runMessages.clearFilters)}
    </Button>
  {/if}
</div>
