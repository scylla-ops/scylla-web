<script lang="ts">
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import { scyllaNavigate } from '@platform/context';
  import { Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { latestVersion, type FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { isNewFragment, nodesLine } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';
  import FragmentIcon from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/FragmentIcon.svelte';
  import FavoriteButton from '../FavoriteButton.svelte';
  import SourceLine from '../SourceLine.svelte';
  import VersionBadge from '../VersionBadge.svelte';
  import UpstreamStrip from './UpstreamStrip.svelte';

  interface Props {
    fragment: FragmentEntity;
  }

  let { fragment }: Props = $props();

  const latest = $derived(latestVersion(fragment));
  const open = () => scyllaNavigate.goToWorkspaceRoute(`library/${fragment.id}`);

  const credit = $derived.by(() => {
    const { source } = fragment;
    if (!source) return libraryMessages.authorAndDate(latest.author.name, getRelativeTime(latest.publishedAt));
    const date = getRelativeTime(source.addedAt);
    return source.kind === 'forked'
      ? communityMessages.forkedBy(fragment.author.name, date)
      : communityMessages.addedBy(fragment.author.name, date);
  });
</script>

<Card
  data-fragment-id={fragment.id}
  class="group flex h-full cursor-pointer flex-col gap-3 p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
  onclick={open}
>
  <div class="flex items-center gap-2.5">
    <FragmentIcon forked={fragment.source?.kind === 'forked'} />
    <div class="flex min-w-0 flex-col">
      <span class="flex min-w-0 items-center gap-2">
        <!-- The name is the link: a keyboard reaches each fragment. -->
        <a
          href="library/{fragment.id}"
          class="min-w-0 truncate font-semibold focus-visible:underline focus-visible:outline-none"
          onclick={event => {
            event.preventDefault();
            event.stopPropagation();
            open();
          }}
        >
          {fragment.name}
        </a>
        <VersionBadge number={latest.number} filled={fragment.source?.kind !== 'forked'} />
        {#if isNewFragment(fragment)}
          <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t(libraryMessages.newFragment)}</span>
        {/if}
      </span>
      {#if fragment.source}
        <SourceLine source={fragment.source} />
      {/if}
    </div>
    {#if fragment.source?.kind !== 'linked'}
      <span class="ml-auto"><FavoriteButton {fragment} /></span>
    {/if}
  </div>
  <p class="line-clamp-2 min-h-10 text-sm text-muted-foreground">{fragment.description}</p>
  <p class="truncate rounded-md bg-muted px-2 py-1 font-mono text-xs">{nodesLine(latest.nodes)}</p>
  <UpstreamStrip {fragment} onOpen={open} />
  <div class="mt-auto flex items-center gap-1.5 text-xs">
    <WorkflowIcon class="size-3.5 text-muted-foreground" />
    <span class="font-medium">{t(libraryMessages.usedIn(fragment.usages.length))}</span>
    <span class="ml-auto truncate text-muted-foreground">{t(credit)}</span>
  </div>
</Card>
