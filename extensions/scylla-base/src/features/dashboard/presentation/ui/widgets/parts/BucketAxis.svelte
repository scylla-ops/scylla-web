<script lang="ts">
  interface Props {
    labels: readonly [string, string, string];
  }

  let { labels }: Props = $props();
</script>

<div class="flex justify-between text-xs text-muted-foreground tabular-nums">
  {#each labels as label, index (index)}
    <span>{label}</span>
  {/each}
</div>
