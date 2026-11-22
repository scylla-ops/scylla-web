<script lang="ts">
  import { Button, Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { FragmentPublication } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  let { detail, publication }: { detail: FragmentDetail; publication: FragmentPublication } =
    $props();

  // The oldest version still offered goes first; the last one stays, or the fragment is gone.
  const offered = $derived(publication.versions.filter(number => !publication.deprecated.includes(number)));
  const oldest = $derived(offered.length > 1 ? offered[0] : undefined);
</script>

<!-- The follow-up of a public fragment: when it went public, and its stars. -->
<Card class="flex flex-col gap-4 p-4">
  <div class="flex flex-wrap items-baseline gap-2">
    <h2>{t(communityMessages.onMarketplace)}</h2>
    <span class="text-xs text-muted-foreground">
      {t(communityMessages.publishedOn(formatDay(publication.publishedAt), publication.publishedBy.name))}
    </span>
  </div>

  <dl class="flex gap-3">
    <div class="rounded-lg bg-muted/60 p-2.5">
      <dt class="text-xs text-muted-foreground">{t(communityMessages.stars)}</dt>
      <dd class="text-lg font-semibold">{publication.stats.stars}</dd>
    </div>
  </dl>

  {#if detail.canPublishToMarketplace && oldest !== undefined}
    <div class="flex flex-wrap items-center gap-3 border-t pt-3">
      <p class="flex-1 text-xs text-muted-foreground">{t(communityMessages.deprecateHint)}</p>
      <Button size="sm" variant="ghost-destructive" onclick={() => detail.deprecate(oldest)}>
        {t(communityMessages.deprecate(oldest))}
      </Button>
    </div>
  {/if}
</Card>
