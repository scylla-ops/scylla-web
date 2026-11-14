<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import GlobeIcon from '@lucide/svelte/icons/globe';
  import LockIcon from '@lucide/svelte/icons/lock';
  import {
    Badge,
    Button,
    Input,
    Label,
    RadioGroup,
    RadioGroupItem,
    Separator,
    Switch,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { PipelineSource } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
  import { newProjectMessages as messages } from '@base/features/integrations/presentation/messages/new-project.messages.ts';
  import { pipelineSourceMessages } from '@base/features/integrations/presentation/messages/pipeline-source.messages.ts';
  import { repositoryMessages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import { providerName } from '@base/features/integrations/presentation/presenters/repository-link.presenter.ts';
  import type { NewGitHubProject } from './new-github-project.state.svelte.ts';

  interface Props {
    page: NewGitHubProject;
    /** The repository settings of the project, once it exists. */
    settingsHref: string;
  }

  let { page, settingsHref }: Props = $props();

  const id = $props.id();

  const SOURCES = [
    {
      value: 'editor',
      title: pipelineSourceMessages.editor,
      body: pipelineSourceMessages.editorBody,
    },
    { value: 'file', title: pipelineSourceMessages.files, body: pipelineSourceMessages.filesBody },
  ] as const;
</script>

<form
  class="flex flex-col gap-6"
  novalidate
  onsubmit={event => {
    event.preventDefault();
    void page.submit();
  }}
>
  <section class="flex flex-col gap-4 rounded-xl border bg-card p-5">
    {#if page.picked}
      {@const repository = page.picked.repository}
      <div class="flex items-center gap-3 rounded-lg border px-3 py-2.5">
        {#if repository.private}
          <LockIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {:else}
          <GlobeIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {/if}
        <div class="flex min-w-0 grow flex-col gap-0.5">
          <span class="truncate font-mono text-sm font-medium">{repository.fullName}</span>
          <span class="truncate text-xs text-muted-foreground">
            {t(messages.repositoryDetails(page.picked.details, page.picked.connectionLabel))}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!page.canChange}
          aria-label="{t(messages.change)} {repository.fullName}"
          onclick={page.change}
        >
          {t(messages.change)}
        </Button>
      </div>
    {/if}

    <div class="flex flex-col gap-2">
      <Label for="{id}-name">{t(messages.projectName)}</Label>
      <Input
        id="{id}-name"
        autocomplete="off"
        disabled={page.created || page.working}
        aria-describedby="{id}-name-description"
        bind:value={page.name}
      />
      <p id="{id}-name-description" class="text-xs text-muted-foreground">
        {t(messages.fromRepository)}
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <Label for="{id}-description">{t(messages.description)}</Label>
      <Input
        id="{id}-description"
        autocomplete="off"
        placeholder={t(messages.descriptionPlaceholder)}
        disabled={page.created || page.working}
        bind:value={page.description}
      />
    </div>

    <Separator />

    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-0.5">
        <span id="{id}-source" class="text-sm font-medium">{t(pipelineSourceMessages.title)}</span>
        <span class="text-xs text-muted-foreground">{t(pipelineSourceMessages.description)}</span>
      </div>
      <RadioGroup
        class="flex flex-col gap-3"
        aria-labelledby="{id}-source"
        disabled={page.working}
        bind:value={() => page.source, next => (page.source = next as PipelineSource)}
      >
        {#each SOURCES as item (item.value)}
          {@const checked = page.source === item.value}
          <Label
            class={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 font-normal transition-colors',
              checked && 'border-primary',
            )}
          >
            <RadioGroupItem
              value={item.value}
              aria-labelledby="{id}-{item.value}"
              aria-describedby="{id}-{item.value}-body"
            />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="flex flex-wrap items-center gap-2">
                <span id="{id}-{item.value}" class="text-sm font-medium">{t(item.title)}</span>
                {#if item.value === 'file'}
                  <Badge variant="secondary">{t(pipelineSourceMessages.formats)}</Badge>
                {/if}
              </span>
              <span id="{id}-{item.value}-body" class="text-xs text-muted-foreground">
                {t(item.body)}
              </span>
            </span>
          </Label>
        {/each}
      </RadioGroup>
    </div>

    <Label class="flex w-fit cursor-pointer items-center gap-2.5 font-normal">
      <Switch
        disabled={page.working}
        aria-describedby="{id}-reports-body"
        bind:checked={() => page.reports, next => (page.reports = next)}
      />
      <span class="flex flex-col gap-0.5">
        <span class="text-sm font-medium">
          {t(repositoryMessages.reportTo(providerName('github')))}
        </span>
        <span id="{id}-reports-body" class="text-xs text-muted-foreground">
          {t(messages.reportsBody)}
        </span>
      </span>
    </Label>
  </section>

  <div class="flex flex-wrap items-center gap-3">
    <Button type="button" variant="outline" disabled={!page.canChange} onclick={page.change}>
      <ArrowLeftIcon aria-hidden="true" />
      {t(messages.back)}
    </Button>
    {#if page.failure}
      <div
        role="alert"
        class="flex min-w-64 flex-1 items-center justify-between gap-3 rounded-lg border border-destructive/50 px-3 py-1.5"
      >
        <div class="flex min-w-0 flex-col">
          <p class="text-sm font-medium text-destructive">{t(messages.setupFailed)}</p>
          <p class="text-xs text-muted-foreground">{page.failure}</p>
        </div>
        <Button href={settingsHref} variant="outline" size="sm">{t(messages.openSettings)}</Button>
      </div>
    {/if}
    <Button type="submit" class="ml-auto" disabled={!page.canSubmit}>
      {t(page.created ? messages.retry : messages.create)}
    </Button>
  </div>
</form>
