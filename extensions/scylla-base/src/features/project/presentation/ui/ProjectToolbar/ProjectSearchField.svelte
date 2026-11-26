<script lang="ts">
  import SearchIcon from '@lucide/svelte/icons/search';
  import { Input } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    value: string;
    placeholder: string;
    label: string;
    /** The key "/" at the right of an empty field, on a screen with a keyboard. */
    showKey?: boolean;
    onInput: (value: string) => void;
    onClear: () => void;
    class?: string;
  }

  let { value, placeholder, label, showKey = true, onInput, onClear, class: className }: Props =
    $props();

  let field: HTMLDivElement | undefined = $state();

  /** A key typed in a field, a list or an editor stays there. */
  const typesText = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

  /** "/" from anywhere on the page puts the focus in the field. */
  const focusOnSlash = (event: KeyboardEvent) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.defaultPrevented || typesText(event.target)) return;
    event.preventDefault();
    field?.querySelector('input')?.focus();
  };

  /** Escape clears the text, and the focus stays in the field. */
  const clearOnEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !value) return;
    event.preventDefault();
    onClear();
  };
</script>

<svelte:window onkeydown={focusOnSlash} />

<div bind:this={field} class={cn('relative flex items-center', className)}>
  <SearchIcon
    class="pointer-events-none absolute left-3 size-4 text-muted-foreground"
    aria-hidden="true"
  />
  <Input
    type="search"
    class={cn(
      'h-11 bg-background pl-9 md:h-8 [&::-webkit-search-cancel-button]:appearance-none',
      showKey && 'pr-9',
    )}
    {placeholder}
    aria-label={label}
    aria-keyshortcuts={showKey ? '/' : undefined}
    autocomplete="off"
    {value}
    oninput={event => onInput(event.currentTarget.value)}
    onkeydown={clearOnEscape}
  />
  {#if showKey && !value}
    <kbd
      aria-hidden="true"
      class="pointer-events-none absolute right-2 flex size-5 items-center justify-center rounded border bg-muted font-mono text-xs leading-none text-muted-foreground"
    >
      /
    </kbd>
  {/if}
</div>
