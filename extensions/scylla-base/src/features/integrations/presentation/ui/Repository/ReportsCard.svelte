<script lang="ts">
  import { Badge, Label, Switch } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { RepositoryLink } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
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

  <p class="text-sm text-muted-foreground">
    {t(github ? messages.gitHubReports : messages.gitLabReports)}
  </p>

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
