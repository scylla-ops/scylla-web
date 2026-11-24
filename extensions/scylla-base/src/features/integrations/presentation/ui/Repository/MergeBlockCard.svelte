<script lang="ts">
  import { Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { RepositoryLink } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
  import { mergeBlockMessages as messages } from '@base/features/integrations/presentation/messages/merge-block.messages.ts';
  import {
    mergeCardDescription,
    mergeRuleView,
  } from '@base/features/integrations/presentation/presenters/merge-block.presenter.ts';
  import MergeRuleRow from './MergeRuleRow.svelte';
  import type { RepositoryPage } from './repository-page.state.svelte.ts';

  interface Props {
    page: RepositoryPage;
    link: RepositoryLink;
  }

  let { page, link }: Props = $props();

  const id = $props.id();
  // A link that cannot serve refuses each change: the server gives REPOSITORY_NOT_ACTIVE.
  const locked = $derived(page.settingBlock || link.state !== 'active');
  const rules = $derived(
    page.blocks.map(block => ({
      block,
      view: mergeRuleView(block, link, page.sendingFor(block)),
    })),
  );
</script>

<section class="flex flex-col gap-4 rounded-xl border bg-card p-5" aria-labelledby="{id}-title">
  <div class="flex flex-col gap-1">
    <h2 id="{id}-title" class="text-base">{t(messages.title)}</h2>
    <p class="text-sm text-muted-foreground">{mergeCardDescription(link)}</p>
  </div>

  {#if page.blocksQuery.isError && !page.blocksQuery.data}
    <p class="text-sm text-muted-foreground">{t(messages.readFailed)}</p>
  {:else if page.blocksQuery.isPending}
    <Skeleton class="h-17 w-full rounded-lg" />
  {:else if rules.length === 0}
    <p class="text-sm text-muted-foreground">{t(messages.noPipeline)}</p>
  {:else}
    <div class="flex flex-col gap-3">
      {#each rules as rule (rule.block.pipelineId ?? 'project')}
        <MergeRuleRow
          view={rule.view}
          canManage={page.canManage}
          {locked}
          onChange={enabled => page.setBlock(rule.block, enabled)}
          onRetry={() => page.setBlock(rule.block, rule.block.enabled)}
        />
      {/each}
    </div>
  {/if}
</section>
