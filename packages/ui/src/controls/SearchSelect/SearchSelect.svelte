<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxTrigger,
  } from '../../primitives/index.ts';
  import { cn, matchesSearch } from '../../utils/index.ts';
  import { searchSelectMessages as messages } from './search-select.messages.ts';
  import type { SearchSelectOption } from './search-select.ts';

  interface Props {
    options: readonly SearchSelectOption[];
    value?: string;
    onValueChange?: (value: string) => void;
    id?: string;
    placeholder?: string;
    'aria-label'?: string;
    disabled?: boolean;
    /** For a field that appears after a click: the user can type at once. */
    focusOnMount?: boolean;
    /** Rows can still arrive: a search with no row does not say "No match". */
    loading?: boolean;
    /** The line of a list with no option at all. */
    emptyText?: string;
    /** On the field. */
    class?: string;
    /** On the list. */
    contentClass?: string;
    /** A row that is more than a label and a hint. */
    row?: Snippet<[SearchSelectOption]>;
  }

  let {
    options,
    value = $bindable(''),
    onValueChange,
    id,
    placeholder,
    'aria-label': ariaLabel,
    disabled = false,
    focusOnMount = false,
    loading = false,
    emptyText,
    class: className,
    contentClass,
    row,
  }: Props = $props();

  const uid = $props.id();
  const listId = `${uid}-list`;

  let open = $state(false);
  /** Null until a key goes in the field: the list is full and the field shows the chosen label. */
  let search = $state<string | null>(null);

  const selected = $derived(options.find(option => option.value === value));
  const shown = $derived(
    options.filter(option =>
      matchesSearch(search ?? '', [option.label, option.hint, ...(option.keywords ?? [])]),
    ),
  );
  const text = $derived((open ? search : null) ?? selected?.label ?? '');
  const emptyLine = $derived.by(() => {
    if (loading) return t(messages.loading);
    return options.length === 0 && emptyText ? emptyText : t(messages.noMatch);
  });

  // The list keeps its rows while it closes: the search goes when it opens again.
  const onOpenChange = (next: boolean) => {
    if (next) search = null;
  };

  const onclick = (event: MouseEvent & { currentTarget: HTMLInputElement }) => {
    if (open) return;
    open = true;
    onOpenChange(true);
    event.currentTarget.select();
  };

  const oninput = (event: Event & { currentTarget: HTMLInputElement }) => {
    search = event.currentTarget.value;
    open = true;
  };

  // With no row, bits-ui closes the list on Enter and the text of the user goes.
  const onkeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && open && shown.length === 0) event.preventDefault();
  };
</script>

<Combobox type="single" allowDeselect={false} bind:value {onValueChange} bind:open {onOpenChange} {disabled}>
  <div data-slot="search-select" class={cn('relative w-full', className)}>
    <ComboboxInput
      {id}
      value={text}
      class="pr-8"
      {focusOnMount}
      {placeholder}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-controls={open ? listId : undefined}
      {onclick}
      {oninput}
      {onkeydown}
    />
    <ComboboxTrigger aria-label={t(messages.showOptions)} />
    <!-- Always there: a live region that appears with its text is not read. -->
    <span role="status" class="sr-only">{open && shown.length === 0 ? emptyLine : ''}</span>
  </div>
  <ComboboxContent id={listId} class={contentClass}>
    {#each shown as option (option.value)}
      <ComboboxItem value={option.value} label={option.label} disabled={option.disabled}>
        {#if row}
          {@render row(option)}
        {:else}
          <span class="flex min-w-0 flex-col">
            <span class="truncate">{option.label}</span>
            {#if option.hint}
              <span class="truncate text-xs text-muted-foreground">{option.hint}</span>
            {/if}
          </span>
        {/if}
      </ComboboxItem>
    {:else}
      <p aria-hidden="true" class="px-2 py-1.5 text-sm text-muted-foreground">{emptyLine}</p>
    {/each}
  </ComboboxContent>
</Combobox>
