<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import LinkIcon from '@lucide/svelte/icons/link';
  import { Button, Tooltip, TooltipContent, TooltipTrigger } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import { shareLinkButtonMessages } from './share-link-button.messages.ts';
  import { shareLink, sharesWithSystem } from './share-link.ts';

  interface Props {
    /** The link. Default: the address of the page at the click. `null` hides the button. */
    url?: () => string | null;
    /** The second line of the toast, e.g. who can open the link. */
    hint?: string;
    class?: string;
  }

  let { url = () => window.location.href, hint, class: className }: Props = $props();

  const label = $derived(
    t(sharesWithSystem() ? shareLinkButtonMessages.shareLink : shareLinkButtonMessages.copyLink),
  );

  let done = $state(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const share = async () => {
    const link = url();
    if (link === null || !(await shareLink(link, hint))) return;
    done = true;
    // Restart the timer, so a second click keeps the checkmark for its full delay.
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => (done = false), 2000);
  };
</script>

{#if url() !== null}
  <Tooltip>
    <TooltipTrigger onclick={() => void share()}>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          size="icon"
          class={cn('size-8 shrink-0 rounded-lg', className)}
          aria-label={label}
          data-done={done || undefined}
        >
          {#if done}
            <CheckIcon class="size-4 text-status-passed" aria-hidden="true" />
          {:else}
            <LinkIcon class="size-4" aria-hidden="true" />
          {/if}
        </Button>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
{/if}
