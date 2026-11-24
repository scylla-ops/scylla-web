<script lang="ts">
  import SearchIcon from '@lucide/svelte/icons/search';
  import type { CommandForm } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import { modifierKey } from './modifier-key.ts';

  let open = $state(false);
  let started = $state(false);

  // Here: a form must stay open after the bar closes.
  let form = $state.raw<{ load: CommandForm['load']; props?: object } | null>(null);
  let formOpen = $state(false);

  const shortcut = `${modifierKey()}K`;

  const setOpen = (next: boolean) => {
    started = true;
    open = next;
  };

  const openForm = ({ load, props }: CommandForm) => {
    form = { load, props: props?.() };
    formOpen = true;
  };

  const onWindowKey = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setOpen(!open);
    }
  };
</script>

<svelte:window onkeydown={onWindowKey} />

<button
  type="button"
  class="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-border px-2 text-sm text-muted-foreground transition-colors outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none lg:w-75 lg:px-2.5"
  aria-label={t(layoutMessages.search)}
  onclick={() => setOpen(true)}
>
  <SearchIcon class="size-4 shrink-0" aria-hidden="true" />
  <span class="hidden min-w-0 flex-1 truncate text-left lg:block">
    {t(layoutMessages.searchPlaceholder)}
  </span>
  <kbd class="hidden rounded-md bg-muted px-1.5 py-0.5 font-sans text-xs lg:block">{shortcut}</kbd>
</button>

<!-- In its own chunk: the top bar is on each page, and the bar opens from time to time. -->
{#if started}
  {#await import('../CommandBar/CommandBar.svelte') then { default: CommandBar }}
    <CommandBar {open} onOpenChange={next => (open = next)} {openForm} />
  {/await}
{/if}

{#if form}
  {#key form}
    {#await form.load() then { default: Form }}
      <Form {...form.props} open={formOpen} setOpen={next => (formOpen = next)} />
    {/await}
  {/key}
{/if}
