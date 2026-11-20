<script lang="ts">
  import { Button, Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { FragmentPublication } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  let { detail, publication }: { detail: FragmentDetail; publication: FragmentPublication } =
    $props();

  const stats = $derived([
    { label: communityMessages.installs, value: publication.stats.installs },
    { label: communityMessages.organizations, value: publication.stats.organizations },
    { label: communityMessages.stars, value: publication.stats.stars },
    { label: communityMessages.forks, value: publication.stats.forks },
  ]);

  const adoption = $derived([...publication.stats.adoption].sort((a, b) => b.version - a.version));
  const widest = $derived(Math.max(1, ...adoption.map(entry => entry.organizations)));

  // The oldest version still offered goes first; the last one stays, or the fragment is gone.
  const offered = $derived(publication.versions.filter(number => !publication.deprecated.includes(number)));
  const oldest = $derived(offered.length > 1 ? offered[0] : undefined);
</script>

<!-- The follow-up of a public fragment: who adds it, and which versions they run. -->
<Card class="flex flex-col gap-4 p-4">
  <div class="flex flex-wrap items-baseline gap-2">
    <h2>{t(communityMessages.onMarketplace)}</h2>
    <span class="text-xs text-muted-foreground">
      {t(communityMessages.publishedOn(formatDay(publication.publishedAt), publication.publishedBy.name))}
    </span>
  </div>

  <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {#each stats as stat (stat.label.id)}
      <div class="rounded-lg bg-muted/60 p-2.5">
        <dt class="text-xs text-muted-foreground">{t(stat.label)}</dt>
        <dd class="text-lg font-semibold">{stat.value}</dd>
      </div>
    {/each}
  </dl>

  <section class="flex flex-col gap-2">
    <h3 class="text-xs text-muted-foreground uppercase">{t(communityMessages.adoptionHeading)}</h3>
    {#if adoption.length}
      <ul class="flex flex-col gap-1.5">
        {#each adoption as entry (entry.version)}
          <li class="flex items-center gap-3 text-xs">
            <span class="w-40 shrink-0">{t(communityMessages.adoptionRow(entry.version, entry.organizations))}</span>
            <span class="h-1.5 flex-1 rounded-full bg-muted">
              <span
                class="block h-full rounded-full bg-primary"
                style:width="{(entry.organizations / widest) * 100}%"
              ></span>
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-xs text-muted-foreground">{t(communityMessages.noAdoption)}</p>
    {/if}
  </section>

  {#if detail.canPublishToMarketplace && oldest !== undefined}
    <div class="flex flex-wrap items-center gap-3 border-t pt-3">
      <p class="flex-1 text-xs text-muted-foreground">{t(communityMessages.deprecateHint)}</p>
      <Button size="sm" variant="ghost-destructive" onclick={() => detail.deprecate(oldest)}>
        {t(communityMessages.deprecate(oldest))}
      </Button>
    </div>
  {/if}
</Card>
