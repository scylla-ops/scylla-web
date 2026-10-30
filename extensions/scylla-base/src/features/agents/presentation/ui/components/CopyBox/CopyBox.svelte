<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import EyeIcon from '@lucide/svelte/icons/eye';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';
  import { t } from '@scylla/ui/i18n';
  import { cn, copyToClipboard } from '@scylla/ui/utils';
  import { copyBoxMessages as messages } from '@base/features/agents/presentation/messages/copy-box.messages.ts';

  interface Props {
    /** Copied as it is, also while the secret is masked. */
    value: string;
    /** The part of `value` that shows as bullets until `revealed`. It is not in the DOM while masked. */
    secret?: string;
    revealed?: boolean;
    /** The eye button that sets `revealed`. Off when another box drives it. */
    toggle?: boolean;
    /** A caption above the value, e.g. "Run on the agent machine". */
    caption?: string;
    copyToast: string;
    /** `wrap` breaks a long value; `lines` keeps each line whole and scrolls it inside the box. */
    layout?: 'wrap' | 'lines';
    /** Focuses the copy button on mount, without a scroll. */
    focusOnMount?: boolean;
    class?: string;
  }

  let {
    value,
    secret,
    revealed = $bindable(false),
    toggle = true,
    caption,
    copyToast,
    layout = 'wrap',
    focusOnMount = false,
    class: className,
  }: Props = $props();

  // One bullet per character keeps the width when the secret shows. A value that does not hold
  // the secret as it is shows only the bullets.
  const parts = $derived.by(() => {
    if (!secret || revealed) return [value];
    return value.includes(secret) ? value.split(secret) : ['', ''];
  });
  const bullets = $derived('•'.repeat(secret?.length ?? 0));
  const hasToggle = $derived(!!secret && toggle);
  const inset = $derived(hasToggle ? 'pr-20' : 'pr-12');

  let copied = $state(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const copy = async () => {
    if (!(await copyToClipboard(value, { copied: copyToast, failed: t(messages.copyFailed) }))) return;
    copied = true;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => (copied = false), 1500);
  };

  const focusWithoutScroll = (node: HTMLElement) => {
    node.focus({ preventScroll: true });
  };
</script>

{#snippet masked()}<span aria-hidden="true">{bullets}</span><span class="sr-only">{t(messages.hidden)}</span>{/snippet}

<div class={cn('relative rounded-lg border bg-muted/50', className)}>
  {#if caption}
    <p class={cn('px-3.5 pt-3 text-xs text-muted-foreground', inset)}>{caption}</p>
  {/if}
  <pre
    class={cn(
      'px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground',
      inset,
      layout === 'wrap'
        ? 'break-all whitespace-pre-wrap'
        : 'relative overflow-x-auto whitespace-pre contain-inline-size',
    )}>{#each parts as part, index (index)}{#if index > 0}{@render masked()}{/if}{part}{/each}</pre>
  <div class="absolute top-2 right-2 flex gap-0.5">
    <button
      type="button"
      onclick={() => void copy()}
      aria-label={t(messages.copy)}
      {@attach focusOnMount && focusWithoutScroll}
      class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      {#if copied}
        <CheckIcon class="size-4" />
      {:else}
        <CopyIcon class="size-4" />
      {/if}
    </button>
    {#if hasToggle}
      <button
        type="button"
        onclick={() => (revealed = !revealed)}
        aria-pressed={revealed}
        aria-label={t(messages.show)}
        class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        {#if revealed}
          <EyeOffIcon class="size-4" />
        {:else}
          <EyeIcon class="size-4" />
        {/if}
      </button>
    {/if}
  </div>
</div>
