<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import {
    Button,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    type ButtonSize,
    type ButtonVariant,
  } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import { gatedButtonMessages } from './gated-button.messages.ts';

  type Props = HTMLButtonAttributes & {
    /** False makes the button inert and gives `deniedReason` on hover, on focus and to a screen reader. */
    allowed?: boolean;
    deniedReason?: string;
    /** Hover text while the button is usable, for an icon-only button. */
    tooltip?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    children?: Snippet;
  };

  let {
    allowed = true,
    deniedReason,
    tooltip,
    disabled,
    onclick,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const reasonId = $props.id();
  const reason = $derived(deniedReason ?? t(gatedButtonMessages.notPermitted));
  const hint = $derived(allowed ? tooltip : reason);

  type ClickEvent = Parameters<NonNullable<HTMLButtonAttributes['onclick']>>[0];

  const guard = (triggerClick: unknown) => (event: ClickEvent) => {
    if (typeof triggerClick === 'function') triggerClick(event);
    if (!allowed) {
      event.preventDefault();
      return;
    }
    onclick?.(event);
  };
</script>

<!--
  A denied button stays focusable (`aria-disabled`, not `disabled`): the keyboard reaches it, the
  tooltip opens on focus, and `aria-describedby` reads the reason. One element in both states, so
  a dialog that it opened can give the focus back to it.
-->
<Tooltip>
  <TooltipTrigger>
    {#snippet child({ props })}
      <Button
        {...rest}
        {...props}
        {...allowed
          ? { disabled }
          : { type: 'button', 'aria-disabled': 'true', 'aria-describedby': reasonId }}
        class={cn(
          className,
          'aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:scale-100',
        )}
        onclick={guard(props.onclick)}
      >
        {@render children?.()}
      </Button>
    {/snippet}
  </TooltipTrigger>
  {#if hint}
    <TooltipContent>
      <p>{hint}</p>
    </TooltipContent>
  {/if}
</Tooltip>
{#if !allowed}
  <span id={reasonId} class="sr-only">{reason}</span>
{/if}
