<script lang="ts">
  import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
  import GitForkIcon from '@lucide/svelte/icons/git-fork';
  import LinkIcon from '@lucide/svelte/icons/link';
  import { t } from '@scylla/ui/i18n';
  import type { FragmentSource } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { sourceReference } from '@base/features/pipeline/presentation/presenters/fragment-community.presenter.ts';

  interface Props {
    source: FragmentSource;
  }

  let { source }: Props = $props();
</script>

<!-- Where a fragment of the marketplace comes from, under its name. -->
<span class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
  {#if source.kind === 'linked'}
    <LinkIcon class="size-3 shrink-0" />
    <span class="truncate">{t(communityMessages.linkedTo(source.package.publisher))}</span>
  {:else}
    <GitForkIcon class="size-3 shrink-0" />
    <span class="truncate">{t(communityMessages.forkedFrom(sourceReference({ source })))}</span>
  {/if}
  {#if source.package.verified}
    <BadgeCheckIcon class="size-3 shrink-0 text-primary" aria-label={t(communityMessages.verified)} />
  {/if}
</span>
