<script lang="ts">
  import SearchSelect from './SearchSelect.svelte';
  import type { SearchSelectOption } from './search-select.ts';

  interface Props {
    options: readonly SearchSelectOption[];
    initial?: string;
    /** The owner adds, and holds no value: back to empty after each pick. */
    resets?: boolean;
    onPick?: (value: string) => void;
    loading?: boolean;
    emptyText?: string;
    richRows?: boolean;
  }

  let { options, initial = '', resets = false, onPick, loading, emptyText, richRows }: Props = $props();

  // svelte-ignore state_referenced_locally
  let value = $state(initial);
</script>

{#snippet rich(option: SearchSelectOption)}
  <strong>rich {option.label}</strong>
{/snippet}

<SearchSelect
  {options}
  bind:value
  onValueChange={next => {
    onPick?.(next);
    if (resets) value = '';
  }}
  placeholder="Choose"
  aria-label="Member"
  {loading}
  {emptyText}
  row={richRows ? rich : undefined}
/>
<button type="button">after</button>
<span data-testid="value">{value}</span>
