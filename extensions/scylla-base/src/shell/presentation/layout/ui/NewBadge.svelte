<script lang="ts">
  import { SIDEBAR_FADE } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { highlightIdForNav, isUnseen } from '../whats-new.svelte.ts';
  import { layoutMessages } from './layout.messages.ts';

  /** The path of a sidebar link in its mount. */
  let { url }: { url: string } = $props();

  const highlightId = $derived(highlightIdForNav(url));
</script>

{#if highlightId && isUnseen(highlightId)}
  <span class={cn('relative ml-auto inline-flex', SIDEBAR_FADE)}>
    <span class="absolute inset-0 animate-ping rounded-full bg-primary opacity-40"></span>
    <span
      class="relative rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground"
    >
      {t(layoutMessages.newBadge)}
    </span>
  </span>
{/if}
