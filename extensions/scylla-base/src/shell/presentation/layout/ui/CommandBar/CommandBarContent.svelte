<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { can } from '@platform/authz';
  import { contextStore, navigateTo, workspaceUrl } from '@platform/context';
  import {
    installedExtensions,
    navLinks,
    routeParams,
    type CommandDefinition,
    type CommandForm,
  } from '@scylla/core-sdk';
  import { ColorGlyph, motionDuration, swapIn, swapOut } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from '@scylla/ui/primitives';
  import { dialogHoldStore, toRune } from '@scylla/ui/stores';
  import { cn, toast } from '@scylla/ui/utils';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import { commandBarMessages as messages } from '@base/shell/presentation/layout/messages/command-bar.messages.ts';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import { linkParams } from '@base/shell/presentation/shell-params.ts';
  import { modifierKey } from '../GlobalSearch/modifier-key.ts';
  import CommandConfirm from './CommandConfirm.svelte';
  import CommandRowIcon from './CommandRowIcon.svelte';
  import { appearRow } from './command-row.attachments.ts';
  import { addRecent, readRecent, readRecentRows } from './command-recent.ts';
  import {
    chipPressed,
    commandChips,
    commandResults,
    firstActionable,
    groupTitle,
    nameParts,
    parseCommandText,
    resultItems,
    type CommandFilter,
  } from './command-results.presenter.ts';
  import { buildCommandRows, buildRecentRows, type CommandRow } from './command-rows.presenter.ts';
  import { toRecentRow } from './command-search-rows.presenter.ts';
  import { HINT_EXAMPLES, showCommandHints } from './command-hints.ts';
  import { createCommandSearch } from './command-search.state.svelte.ts';
  import { createCommandSources } from './command-sources.state.svelte.ts';
  import CommandSearchStatus from './CommandSearchStatus.svelte';
  import RunPipelineConfirm from './RunPipelineConfirm.svelte';

  interface Props {
    close: () => void;
    openForm: (form: CommandForm) => void;
  }

  let { close, openForm }: Props = $props();

  const context = toRune(contextStore);
  let text = $state('');
  const parsed = $derived(parseCommandText(text));
  const sources = createCommandSources(() => parsed.search);

  const workspace = $derived(context().workspace);
  const project = $derived(context().project);
  const pipelineId = $derived(routeParams().pipelineId);

  const commands: readonly CommandDefinition[] = installedExtensions()
    .flatMap(extension => extension.modules)
    .flatMap(module => module.commands ?? []);

  let chip = $state<CommandFilter | null>(null);
  let highlighted = $state('');
  let confirming = $state<CommandRow | null>(null);
  let input = $state<HTMLInputElement | null>(null);
  let chipRow = $state<HTMLDivElement | null>(null);

  const recent = readRecent(context().workspace.id);
  const recentRows = buildRecentRows(readRecentRows(context().workspace.id));

  const filter = $derived(parsed.filter ?? chip);
  const search = createCommandSearch(() => ({ search: parsed.search, filter }));

  const rows = $derived(
    buildCommandRows({
      ...sources.data,
      ...search.data,
      actions: search.actions,
      workspaceName: workspace.name,
      links: navLinks(),
      commands,
      slug: linkParams().workspaceSlug,
      workspaceId: workspace.id,
      project,
      pipelineId,
      search: parsed.search,
      can,
      other: sources.other,
    }),
  );

  const order = $derived({
    openProject: project.id,
    recent,
    recentRows,
    searching: search.searching,
    here: pipelineId ? ('pipeline' as const) : ('project' as const),
  });
  const chips = $derived(
    commandChips(rows, search.available, {
      search: parsed.search,
      active: filter,
      order,
      searching: search.searching,
    }),
  );
  const failed = $derived([...new Set([...sources.failed, ...search.failed])]);

  const results = $derived(commandResults(rows, parsed.search, filter, order));
  const items = $derived(resultItems(results));
  const selected = $derived(items.find(item => item.id === highlighted));
  const searching = $derived(!!parsed.search.trim() || !!filter);
  const tourHold = toRune(dialogHoldStore);
  const hinting = $derived(showCommandHints(recent.length, searching, tourHold().held));
  const canOpenInTab = $derived(selected?.kind === 'row' && selected.row.effect.kind === 'go');

  $effect(() => {
    if (!confirming) input?.focus();
  });

  // The active chip comes into view inside the row only: the dialog never scrolls.
  $effect(() => {
    void filter;
    const pressed = chipRow?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!chipRow || !pressed) return;
    const left = pressed.offsetLeft - chipRow.offsetLeft;
    const over = left + pressed.offsetWidth + 24 - (chipRow.scrollLeft + chipRow.clientWidth);
    if (left - 24 < chipRow.scrollLeft) chipRow.scrollLeft = Math.max(0, left - 24);
    else if (over > 0) chipRow.scrollLeft += over;
  });

  const setFilter = (next: CommandFilter | null) => {
    chip = next;
    text = parsed.search;
    highlighted = firstActionable(commandResults(rows, parsed.search, next, order));
  };

  const moveChip = (step: number) => {
    const at = chips.findIndex(({ filter: value }) => chipPressed(value, filter));
    const next = chips[(Math.max(at, 0) + step + chips.length) % chips.length];
    setFilter(next.filter);
  };

  const remember = (row: CommandRow) => addRecent(workspace.id, row.id, toRecentRow(row));

  const change = async (row: CommandRow) => {
    if (row.effect.kind !== 'change') return;
    const { apply, undo, done } = row.effect;
    remember(row);
    close();
    await apply();
    toast.success(done, undo && { action: { label: t(messages.undo), onClick: () => void undo() } });
  };

  const pick = (row: CommandRow) => {
    const { effect } = row;
    switch (effect.kind) {
      case 'go':
        remember(row);
        close();
        navigateTo(effect.href);
        break;
      case 'form':
        remember(row);
        close();
        openForm(effect.form);
        break;
      case 'change':
        void change(row);
        break;
      case 'act':
        remember(row);
        close();
        void effect.run();
        break;
      case 'confirm':
        confirming = row;
        break;
      case 'run':
        remember(row);
        confirming = row;
        break;
      case 'switch':
        remember(row);
        close();
        contextStore.getState().setWorkspace(effect.workspace.id, effect.workspace.name, effect.workspace.slug);
        navigateTo(workspaceUrl(effect.workspace.slug));
        break;
    }
  };

  const halt = (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onInputKey = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === 229) return;
    switch (event.key) {
      case 'Enter':
        if (event.repeat) {
          halt(event);
        } else if (event.metaKey || event.ctrlKey) {
          halt(event);
          if (selected?.kind === 'row' && selected.row.effect.kind === 'go') {
            remember(selected.row);
            window.open(selected.row.effect.href, '_blank', 'noopener');
            close();
          }
        }
        break;
      case 'Tab':
        halt(event);
        moveChip(event.shiftKey ? -1 : 1);
        break;
      case 'Escape':
        if (filter) {
          halt(event);
          setFilter(null);
        }
        break;
      case 'Backspace':
        if (!text && chip) {
          halt(event);
          setFilter(null);
        }
        break;
    }
  };
</script>

{#if confirming?.effect.kind === 'confirm'}
  <CommandConfirm
    question={confirming.effect.question}
    detail={confirming.effect.detail}
    verb={confirming.effect.verb}
    destructive={confirming.effect.destructive}
    run={confirming.effect.run}
    onCancel={() => (confirming = null)}
    onDone={close}
  />
{:else if confirming?.effect.kind === 'run'}
  <RunPipelineConfirm
    pipelineId={confirming.effect.pipelineId}
    question={confirming.effect.question}
    detail={confirming.effect.detail}
    verb={confirming.effect.verb}
    onCancel={() => (confirming = null)}
    onDone={close}
  />
{:else}
  <Command
    bind:value={highlighted}
    shouldFilter={false}
    vimBindings={false}
    loop
    class="min-w-0"
    label={t(layoutMessages.search)}
  >
    <div class="flex items-center gap-2 border-b border-border px-3">
      <SearchIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <CommandInput
        bind:value={text}
        bind:ref={input}
        autofocus
        placeholder={t(layoutMessages.searchPlaceholder)}
        aria-label={t(layoutMessages.search)}
        onkeydown={onInputKey}
      />
    </div>

    <!-- The row scrolls in its own box and fades at the edges: it never widens the dialog. -->
    <div
      bind:this={chipRow}
      class="relative flex min-w-0 items-center gap-1 overflow-x-auto border-b border-border px-3 py-1.5 [mask-image:linear-gradient(to_right,transparent,black_0.75rem,black_calc(100%-0.75rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <!-- A chip comes when its list loads: it grows in, and the others make room. -->
      {#each chips as { filter: value, title } (value ?? 'all')}
        <button
          type="button"
          tabindex="-1"
          in:swapIn
          out:swapOut
          animate:flip={{ duration: motionDuration(200) }}
          aria-pressed={chipPressed(value, filter)}
          class={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-xs text-muted-foreground outline-hidden transition-colors hover:bg-accent motion-reduce:transition-none',
            chipPressed(value, filter) && 'bg-accent text-accent-foreground',
          )}
          onclick={() => {
            setFilter(value);
            input?.focus();
          }}
        >
          {title}
        </button>
      {/each}
      {#if workspace.name}
        <span class="ml-auto hidden shrink-0 pl-2 text-xs text-muted-foreground sm:block">
          {t(messages.inWorkspace(workspace.name))}
        </span>
      {/if}
    </div>

    <CommandList class="max-h-[min(26rem,55dvh)] px-1 pb-1">
      {#if hinting}
        <div class="flex flex-col gap-2 px-2 py-3 text-xs text-muted-foreground" data-tour="command-hints">
          <p>{t(messages.hintsTitle)}</p>
          <div class="flex flex-wrap items-center gap-1.5">
            {#each HINT_EXAMPLES as example (example)}
              <button
                type="button"
                tabindex="-1"
                class="rounded-md border border-border px-2 py-0.5 font-mono text-foreground outline-hidden transition-colors hover:bg-accent motion-reduce:transition-none"
                onclick={() => {
                  text = example;
                  input?.focus();
                }}
              >
                {example}
              </button>
            {/each}
          </div>
          <p>{t(messages.hintsPrefixes)}</p>
          <p>{t(messages.hintsKeys)}</p>
        </div>
      {/if}
      {#if results.closeOnly}
        <p class="px-2 pt-2 text-xs text-muted-foreground">{t(messages.closeResults)}</p>
      {/if}

      {#each results.sections as section (section.id)}
        <CommandGroup value={section.id} heading={section.heading}>
          {#each section.items as item (item.id)}
            {#if item.kind === 'row'}
              {@const row = item.row}
              <CommandItem
                value={row.id}
                disabled={row.verb === undefined}
                aria-label={row.sentence}
                onSelect={() => pick(row)}
                {@attach appearRow}
              >
                <CommandRowIcon {row} />
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="truncate">
                    {#each nameParts(row.name, item.ranges) as part, index (index)}
                      {#if part.hit}<span class="underline decoration-primary decoration-2 underline-offset-2">{part.text}</span>{:else}{part.text}{/if}
                    {/each}
                  </span>
                  {#if row.owner}
                    <!-- A workspace: the avatar of its owner, then the role and the counts. -->
                    <span
                      class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
                      in:fade|global={{ duration: motionDuration(150) }}
                    >
                      <span class="shrink-0">{row.type} ·</span>
                      <IdentityAvatar profile={row.owner} size={16} />
                      <span class="truncate">
                        {row.facts ? `${row.place} · ${row.facts}` : row.place}
                      </span>
                    </span>
                  {:else if row.placeGlyph && row.place}
                    <!-- The glyph of the place: the folder of a group, a shared dashboard. -->
                    <span class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <span class="shrink-0">{row.type} ·</span>
                      <ColorGlyph icon={row.placeGlyph.icon} color={row.placeGlyph.color} class="size-3" />
                      <span class="truncate">
                        {row.facts ? `${row.place} · ${row.facts}` : row.place}
                      </span>
                    </span>
                  {:else}
                    <span class="truncate text-xs text-muted-foreground">
                      {[row.type, row.place, row.facts].filter(Boolean).join(' · ')}
                    </span>
                  {/if}
                </span>
                <span class="shrink-0 text-xs text-muted-foreground">
                  {row.verb ?? t(messages.current)}
                </span>
              </CommandItem>
            {:else}
              <CommandItem
                value={item.id}
                aria-label={item.sentence}
                onSelect={() => setFilter(item.filter)}
                {@attach appearRow}
              >
                <span class="pl-7 text-xs text-muted-foreground">{t(messages.more(item.count))}</span>
              </CommandItem>
            {/if}
          {/each}
          {#if section.hidden}
            <p class="px-2 py-1 text-xs text-muted-foreground">
              {t(messages.moreHidden(section.hidden))}
            </p>
          {/if}
          {#if section.searching}
            <CommandSearchStatus />
          {/if}
        </CommandGroup>
      {/each}

      {#if searching && sources.loading}
        <p class="px-2 py-2 text-sm text-muted-foreground">{t(messages.reading)}</p>
      {/if}
      {#if searching && failed.length > 0}
        <p class="px-2 py-2 text-sm text-muted-foreground">
          {t(messages.failed(failed.map(groupTitle).join(', ')))}
        </p>
      {/if}
      {#if searching && results.total === 0 && !sources.loading && search.searching.length === 0 && failed.length === 0}
        <p class="px-2 py-6 text-center text-sm text-muted-foreground">
          {t(layoutMessages.searchNoResult)}
        </p>
      {/if}
    </CommandList>

    <div class="sr-only" role="status">
      {#if searching}{t(messages.count(results.total))}{/if}
    </div>

    <div
      class="flex items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground"
      aria-hidden="true"
    >
      <span class="min-w-0 flex-1 line-clamp-2">
        {selected?.kind === 'row' ? selected.row.sentence : (selected?.sentence ?? '')}
      </span>
      <span class="hidden shrink-0 items-center gap-3 sm:flex">
        {#if canOpenInTab}
          <span><kbd class="font-sans">{modifierKey()}↵</kbd> {t(messages.hintNewTab)}</span>
        {/if}
        <span><kbd class="font-sans">Tab</kbd> {t(messages.hintFilter)}</span>
      </span>
    </div>
  </Command>
{/if}
