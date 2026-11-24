<script lang="ts">
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import StoreIcon from '@lucide/svelte/icons/store';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { pendingUpstream } from '@base/features/pipeline/domain/structs/fragment-upstream.struct.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';

  interface Props {
    fragment: FragmentEntity;
    onOpen: () => void;
  }

  let { fragment, onOpen }: Props = $props();

  const pending = $derived(pendingUpstream(fragment));
  const linked = $derived(fragment.source?.kind === 'linked');
</script>

<!-- A version of the publisher waits: the page of the fragment reviews it. -->
{#if pending}
  <div
    class={cn(
      'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs',
      linked ? 'border-warning/50 bg-warning/10 text-warning-foreground' : 'bg-muted text-muted-foreground',
    )}
  >
    {#if linked}
      <RefreshCwIcon class="size-3.5 shrink-0 text-warning" />
      <span class="flex-1 truncate">{t(communityMessages.availableOnMarketplace(pending.number))}</span>
    {:else}
      <StoreIcon class="size-3.5 shrink-0" />
      <span class="flex-1 truncate">{t(communityMessages.upstreamReleased(pending.number))}</span>
    {/if}
    <Button
      size="xs"
      variant="ghost"
      onclick={event => {
        event.stopPropagation();
        onOpen();
      }}
    >
      {t(linked ? libraryMessages.review : communityMessages.compare)}
    </Button>
  </div>
{/if}
