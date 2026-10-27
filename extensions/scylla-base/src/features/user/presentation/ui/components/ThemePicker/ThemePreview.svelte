<script lang="ts">
  import type { Theme } from '@scylla/ui/stores';
  import { PREVIEW_PALETTES } from './theme-preview.ts';

  interface Props {
    theme: Theme;
  }

  let { theme }: Props = $props();

  const p = $derived(PREVIEW_PALETTES[theme]);
</script>

<!-- A drawing of the app in one theme: sidebar, top bar, a title, two cards and a panel. -->
<span class="absolute inset-0 block" style:background={p.canvas}>
  <span
    class="absolute inset-y-0 left-0 block w-[26%] border-r"
    style:background={p.sidebar}
    style:border-color={p.border}
  >
    <span
      class="absolute top-[9%] left-[14%] block aspect-square w-[12%] rounded-full"
      style:background={p.primary}
    ></span>
    {#each [30, 42, 54, 66] as top (top)}
      <span
        class="absolute left-[14%] block h-[5%] w-[64%] rounded-full"
        style:top="{top}%"
        style:background={p.muted}
      ></span>
    {/each}
  </span>
  <span
    class="absolute top-[18%] right-0 left-[26%] block border-t"
    style:border-color={p.border}
  ></span>
  <span
    class="absolute top-[6%] right-[6%] block h-[7%] w-[16%] rounded-full"
    style:background={p.primary}
  ></span>
  <span
    class="absolute top-[27%] left-[32%] block h-[6%] w-[28%] rounded-full"
    style:background={p.foreground}
  ></span>
  {#each [32, 65] as left (left)}
    <span
      class="absolute top-[41%] block h-[22%] w-[29%] rounded-[3px] border"
      style:left="{left}%"
      style:background={p.card}
      style:border-color={p.border}
    ></span>
  {/each}
  <span
    class="absolute top-[70%] right-[6%] -bottom-[4%] left-[32%] block rounded-[3px] border"
    style:background={p.card}
    style:border-color={p.border}
  ></span>
</span>
