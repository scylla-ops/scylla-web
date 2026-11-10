<!--
  One case of a component, with its name above it. `state` shows the content as hovered or
  focused: the pseudo-states addon copies each `:hover` and `:focus` rule of the page to these
  `pseudo-*-all` classes.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    state?: 'hover' | 'focus';
    class?: string;
    children: Snippet;
  }

  let { label, state, class: className, children }: Props = $props();

  const FORCED = {
    hover: 'pseudo-hover-all',
    focus: 'pseudo-focus-all pseudo-focus-visible-all pseudo-focus-within-all',
  };
</script>

<div class={['flex flex-col items-start gap-2', state && FORCED[state], className]}>
  <span class="font-mono text-xs text-muted-foreground">{label}</span>
  {@render children()}
</div>
