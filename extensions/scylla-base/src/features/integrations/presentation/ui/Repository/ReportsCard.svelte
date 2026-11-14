<script lang="ts">
  import { Badge, Label, RadioGroup, RadioGroupItem, Switch } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    ReportMode,
    RepositoryLink,
  } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
  import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import { providerName } from '@base/features/integrations/presentation/presenters/repository-link.presenter.ts';
  import type { RepositoryPage } from './repository-page.state.svelte.ts';

  interface Props {
    page: RepositoryPage;
    link: RepositoryLink;
  }

  let { page, link }: Props = $props();

  const id = $props.id();
  const readOnly = $derived(!page.canManage || page.updating);
  const github = $derived(link.provider === 'github');

  const MODES = [
    {
      value: 'check_run',
      title: messages.checkRun,
      body: messages.checkRunBody,
      recommended: true,
    },
    {
      value: 'commit_status',
      title: messages.commitStatus,
      body: messages.commitStatusBody,
      recommended: false,
    },
  ] as const;
</script>

<section class="flex flex-col gap-4 rounded-xl border bg-card p-5" aria-labelledby="{id}-title">
  <h2 id="{id}-title" class="text-base">{t(messages.reports)}</h2>

  <Label class="flex w-fit cursor-pointer items-center gap-2.5 font-medium">
    <Switch
      disabled={readOnly}
      bind:checked={() => page.reportsEnabled, next => page.setReportsEnabled(next)}
    />
    {t(messages.reportTo(providerName(link.provider)))}
  </Label>

  {#if github}
    <RadioGroup
      class="flex flex-col gap-3"
      aria-label={t(messages.reports)}
      value={page.reportMode}
      disabled={readOnly || !page.reportsEnabled}
      onValueChange={value => page.setReportMode(value as ReportMode)}
    >
      {#each MODES as mode (mode.value)}
        {@const checked = page.reportMode === mode.value}
        <Label
          class={cn(
            'flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 font-normal transition-colors',
            checked && 'border-primary',
            readOnly || !page.reportsEnabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          )}
        >
          <RadioGroupItem
            value={mode.value}
            aria-labelledby="{id}-{mode.value}"
            aria-describedby="{id}-{mode.value}-body"
          />
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="flex items-center gap-2">
              <span id="{id}-{mode.value}" class="text-sm font-medium">{t(mode.title)}</span>
              {#if mode.recommended}
                <Badge variant="secondary">{t(messages.recommended)}</Badge>
              {/if}
            </span>
            <span id="{id}-{mode.value}-body" class="text-xs text-muted-foreground">
              {t(mode.body)}
            </span>
          </span>
        </Label>
      {/each}
    </RadioGroup>
  {:else}
    <p class="text-sm text-muted-foreground">{t(messages.gitLabReports)}</p>
  {/if}

  {#if page.contexts && page.contexts.length > 0 && github}
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs text-muted-foreground">{t(messages.onePerPipeline)}</span>
      {#each page.contexts as context (context)}
        <Badge variant="outline" class="font-mono font-normal">{context}</Badge>
      {/each}
    </div>
  {:else if page.contexts && github}
    <p class="text-xs text-muted-foreground">{t(messages.noPipeline)}</p>
  {:else}
    <p class="text-xs text-muted-foreground">{t(messages.contextPattern)}</p>
  {/if}

  <p class="text-xs text-muted-foreground">{t(messages.onePerCommit)}</p>
</section>
