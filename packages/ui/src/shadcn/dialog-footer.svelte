<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../utils/index.ts';

  type Props = HTMLAttributes<HTMLDivElement> & { children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<div
  data-slot="dialog-footer"
  class={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
  {...rest}
>
  {@render children?.()}
</div>
