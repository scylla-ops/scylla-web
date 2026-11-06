<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { workspaceQueries } from '@base/features/workspace';
  import { contextStore } from '@platform/context';
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    Checkbox,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    ToggleGroup,
    ToggleGroupItem,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import { categoryLabel, CORE_CATEGORIES } from '../../presenters/categories.ts';
  import NotificationList from '../NotificationRow/NotificationList.svelte';
  import { ALL, NotificationsPageState, type NotificationsTab } from './notifications.state.svelte.ts';

  const context = toRune(contextStore);
  const slug = $derived(context().workspace.slug);

  const page = new NotificationsPageState(() => slug);
  const workspaces = createQuery(() => workspaceQueries.mine());

  const categories = $derived([
    ...new Set([...CORE_CATEGORIES, ...page.rows.map(row => row.category)]),
  ]);
  const workspaceName = $derived(
    workspaces.data?.find(item => item.id === page.filters.workspaceId)?.name,
  );
  const inDone = $derived(page.filters.tab === 'done');
  const noneSelected = $derived(page.selected.size === 0);
</script>

<svelte:window onkeydown={page.onKey} />

<div class="flex w-full max-w-4xl flex-col gap-4">
  <h1>{t(messages.title)}</h1>

  <ToggleGroup
    type="single"
    class="w-fit"
    value={page.filters.tab}
    onValueChange={next => {
      if (next) page.update({ tab: next as NotificationsTab });
    }}
  >
    <ToggleGroupItem value="inbox">{t(messages.inbox)}</ToggleGroupItem>
    <ToggleGroupItem value="done">{t(messages.done)}</ToggleGroupItem>
  </ToggleGroup>

  <div class="flex flex-wrap items-center gap-3">
    <Select
      type="single"
      value={page.filters.workspaceId}
      onValueChange={workspaceId => page.update({ workspaceId })}
    >
      <SelectTrigger aria-label={t(messages.workspace)} class="w-56">
        <SelectValue>{workspaceName ?? t(messages.allWorkspaces)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL} label={t(messages.allWorkspaces)}>
          {t(messages.allWorkspaces)}
        </SelectItem>
        {#each workspaces.data ?? [] as workspace (workspace.id)}
          <SelectItem value={workspace.id} label={workspace.name}>{workspace.name}</SelectItem>
        {/each}
      </SelectContent>
    </Select>

    <Select
      type="single"
      value={page.filters.category}
      onValueChange={category => page.update({ category })}
    >
      <SelectTrigger aria-label={t(messages.category)} class="w-52">
        <SelectValue>
          {page.filters.category === ALL
            ? t(messages.allCategories)
            : categoryLabel(page.filters.category)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL} label={t(messages.allCategories)}>
          {t(messages.allCategories)}
        </SelectItem>
        {#each categories as category (category)}
          <SelectItem value={category} label={categoryLabel(category)}>
            {categoryLabel(category)}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>

    <Label class="flex items-center gap-2 text-sm font-normal">
      <Checkbox
        checked={page.filters.unreadOnly}
        onCheckedChange={unreadOnly => page.update({ unreadOnly })}
      />
      {t(messages.unreadOnly)}
    </Label>
    <Label class="flex items-center gap-2 text-sm font-normal">
      <Checkbox
        checked={page.filters.needsActionOnly}
        onCheckedChange={needsActionOnly => page.update({ needsActionOnly })}
      />
      {t(messages.needsActionOnly)}
    </Label>
  </div>

  <div class="flex flex-wrap items-center gap-2 border-b pb-2">
    <Label class="flex items-center gap-2 px-2 text-sm font-normal">
      <Checkbox checked={page.allSelected} onCheckedChange={page.toggleAll} />
      {t(messages.selectAll)}
    </Label>
    <Button
      variant="outline"
      size="sm"
      disabled={noneSelected}
      onclick={() => page.markSelected(true)}
    >
      {t(messages.markRead)}
    </Button>
    <Button
      variant="outline"
      size="sm"
      disabled={noneSelected}
      onclick={() => page.setSelectedDone(!inDone)}
    >
      {t(inDone ? messages.putBack : messages.markDone)}
    </Button>
  </div>

  <NotificationList
    rows={page.rows}
    isLoading={page.isLoading}
    isError={page.isError}
    onRetry={page.retry}
    filtered={page.filtered}
    onClearFilter={page.clearFilters}
    {slug}
    isSelected={id => page.selected.has(id)}
    onToggleSelect={page.toggle}
    activeId={page.activeId}
  />

  {#if page.hasPrevious || page.hasNext}
    <div class="flex justify-end gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label={t(messages.previousPage)}
        disabled={!page.hasPrevious}
        onclick={page.previousPage}
      >
        <ChevronLeftIcon class="size-4" aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label={t(messages.nextPage)}
        disabled={!page.hasNext}
        onclick={page.nextPage}
      >
        <ChevronRightIcon class="size-4" aria-hidden="true" />
      </Button>
    </div>
  {/if}
</div>
