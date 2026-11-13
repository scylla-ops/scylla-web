<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import GlobeIcon from '@lucide/svelte/icons/globe';
  import LockIcon from '@lucide/svelte/icons/lock';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { ListSkeleton } from '@scylla/ui';
  import {
    Button,
    buttonVariants,
    DialogFooter,
    Input,
    Label,
    RadioGroup,
    RadioGroupItem,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { integrationsMessages } from '@base/features/integrations/presentation/messages/integrations.messages.ts';
  import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import { integrationsUrl } from '@base/features/integrations/presentation/presenters/integrations-url.presenter.ts';
  import { createLinkRepository } from './link-repository.state.svelte.ts';

  interface Props {
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    canViewIntegrations: boolean;
    onClose: () => void;
  }

  let { projectId, workspaceId, workspaceSlug, canViewIntegrations, onClose }: Props = $props();

  const id = $props.id();
  const form = createLinkRepository({
    projectId: () => projectId,
    workspaceId: () => workspaceId,
    onLinked: () => onClose(),
  });

  const github = $derived(form.connection?.provider === 'github');
  const connectionLabel = $derived(
    form.connections.find(item => item.id === form.connection?.id)?.label ?? '',
  );
</script>

<form
  class="flex flex-col gap-4"
  novalidate
  onsubmit={event => {
    event.preventDefault();
    form.submit();
  }}
>
  {#if form.loadingConnections}
    <ListSkeleton rows={3} rowClass="h-10 w-full rounded-lg" />
  {:else if !form.connection}
    <div class="flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
      <p class="max-w-sm text-sm text-muted-foreground">{t(messages.noConnection)}</p>
      {#if canViewIntegrations && workspaceSlug}
        <a href={integrationsUrl(workspaceSlug)} class={buttonVariants({ variant: 'outline' })}>
          {t(messages.openIntegrations)}
        </a>
      {/if}
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      <Label for="{id}-connection">{t(messages.connection)}</Label>
      <Select
        type="single"
        value={form.connection.id}
        onValueChange={value => form.pickConnection(value)}
      >
        <SelectTrigger id="{id}-connection" class="w-full">{connectionLabel}</SelectTrigger>
        <SelectContent>
          {#each form.connections as item (item.id)}
            <SelectItem value={item.id} label={item.label}>{item.label}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>

    <div class="relative">
      <SearchIcon
        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        class="pl-9"
        placeholder={t(messages.findRepository)}
        aria-label={t(messages.findRepository)}
        autocomplete="off"
        bind:value={form.typed}
        onkeydown={event => {
          // Enter in the search must not link the repository.
          if (event.key === 'Enter') event.preventDefault();
        }}
      />
    </div>

    {#if form.loadingRepositories}
      <ListSkeleton rows={3} rowClass="h-13 w-full rounded-md" />
    {:else if form.options.length === 0}
      <p role="status" class="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        {t(form.searching ? messages.noMatch : messages.noRepository)}
      </p>
    {:else}
      <RadioGroup
        class="relative flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border p-1"
        aria-label={t(messages.repository)}
        value={form.chosen}
        onValueChange={value => form.choose(value)}
      >
        {#each form.options as option (option.repository.externalId)}
          {@const checked = form.chosen === option.repository.externalId && !option.taken}
          <Label
            class={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 font-normal transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
              checked && 'bg-accent',
              option.taken ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-accent',
            )}
          >
            <RadioGroupItem
              value={option.repository.externalId}
              disabled={option.taken}
              class="sr-only"
              aria-labelledby="{id}-{option.repository.externalId}"
              aria-describedby="{id}-{option.repository.externalId}-details"
            />
            {#if option.repository.private}
              <LockIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {:else}
              <GlobeIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {/if}
            <span class="flex min-w-0 grow flex-col gap-0.5">
              <span
                id="{id}-{option.repository.externalId}"
                class="truncate font-mono text-sm font-medium"
              >
                {option.repository.fullName}
              </span>
              <span
                id="{id}-{option.repository.externalId}-details"
                class="truncate text-xs text-muted-foreground"
              >
                {option.details}
              </span>
            </span>
            {#if checked}
              <CheckIcon class="size-4 shrink-0 text-primary" aria-hidden="true" />
            {/if}
          </Label>
        {/each}
      </RadioGroup>
    {/if}

    {#if form.more}
      <p class="text-xs text-muted-foreground">{t(messages.moreRepositories)}</p>
    {/if}

    <p class="text-xs text-muted-foreground">
      {t(github ? messages.notInListGitHub : messages.notInListGitLab)}
      {#if github && form.connection.settingsUrl}
        <a
          href={form.connection.settingsUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="ml-1 inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          {t(integrationsMessages.configureOnGitHub)}
          <ExternalLinkIcon class="size-3" aria-hidden="true" />
        </a>
      {/if}
    </p>

    {#if form.error}
      <p role="alert" class="text-sm text-destructive">{form.error}</p>
    {/if}
  {/if}

  <DialogFooter>
    <Button type="button" variant="outline" data-dialog-dismiss onclick={onClose}>
      {t(messages.cancel)}
    </Button>
    <Button type="submit" disabled={!form.canSubmit}>{t(messages.link)}</Button>
  </DialogFooter>
</form>
