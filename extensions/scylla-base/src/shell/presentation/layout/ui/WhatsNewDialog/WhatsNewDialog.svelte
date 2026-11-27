<script lang="ts">
  import {
    Button,
    DialogFooter,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@scylla/ui/primitives';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import PauseIcon from '@lucide/svelte/icons/pause';
  import PlayIcon from '@lucide/svelte/icons/play';
  import { ScyllaDialog, prefersReducedMotion, swapIn, swapOut } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { can } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import { startTourById } from '@base/features/onboarding';
  import type { ReleaseHighlight } from '@base/shell/whats-new.ts';
  import { requestCommandBar } from '@base/shell/presentation/layout/command-bar-request.state.svelte.ts';
  import {
    dismissRelease,
    markSeen,
    tabHasNew,
    unseenRelease,
  } from '@base/shell/presentation/layout/whats-new.state.svelte.ts';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';

  const release = $derived(unseenRelease());

  /** The dialog leaves first: an action that opens a dialog or an overlay waits for its exit. */
  const EXIT_MS = 250;

  const canOpen = (highlight: ReleaseHighlight): boolean => {
    const { target } = highlight;
    if (!target) return false;
    return target.kind === 'action' || !target.permission || can(target.permission);
  };

  const go = (highlight: ReleaseHighlight) => {
    const { target } = highlight;
    if (!target) return;
    userPaused = true;
    markSeen(highlight.id);
    dismissRelease();
    if (target.kind === 'page') {
      scyllaNavigate.goToWorkspaceRoute(target.url);
      return;
    }
    setTimeout(() => {
      if (target.id === 'open-command-bar') requestCommandBar();
      else void startTourById('search');
    }, EXIT_MS);
  };

  const TICK_MS = 50;
  const RESUME_AFTER_MS = 1800;
  const MIN_ITEM_MS = 3500;
  const MAX_ITEM_MS = 8000;
  const MS_PER_CHAR = 25;
  /** Share of the item time with no scroll, at the top and at the bottom. */
  const SCROLL_PAUSE = 0.12;
  const USER_EVENTS = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'] as const;

  let active = $state<string>('');
  let elapsed = $state(0);
  let userPaused = $state(false);
  const reduced = prefersReducedMotion();
  let root = $state<HTMLElement>();
  let lastInput = -Infinity;
  let scrollPos = 0;
  let wasRunning = false;
  /** A focused item of the list: the scroll and the tab change would move it under the keyboard. */
  let itemFocused = false;

  $effect(() => {
    if (!active && release) active = release.tabs[0];
  });

  const itemMs = (version: string): number => {
    const chars = (release?.highlights ?? [])
      .filter(highlight => highlight.version === version)
      .reduce(
        (sum, highlight) => sum + t(highlight.title).length + t(highlight.description).length,
        0,
      );
    return Math.min(MAX_ITEM_MS, Math.max(MIN_ITEM_MS, 1700 + chars * MS_PER_CHAR));
  };
  const duration = $derived(itemMs(active));
  const progress = $derived(Math.min(1, elapsed / duration));

  const panel = (): HTMLElement | null =>
    root?.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])') ?? null;

  $effect(() => {
    void active;
    elapsed = 0;
    scrollPos = 0;
    const current = panel();
    if (current) current.scrollTop = 0;
  });

  const tick = () => {
    if (!release) return;
    const running =
      !reduced && !userPaused && !itemFocused && !document.hidden && Date.now() - lastInput >= RESUME_AFTER_MS;
    if (!running) {
      wasRunning = false;
      return;
    }
    const current = panel();
    if (current && !wasRunning) scrollPos = current.scrollTop;
    wasRunning = true;
    elapsed = Math.min(duration, elapsed + TICK_MS);
    const max = current ? current.scrollHeight - current.clientHeight : 0;
    if (current && max > 0) {
      const share = elapsed / duration;
      if (share > SCROLL_PAUSE && share < 1 - SCROLL_PAUSE) {
        scrollPos = Math.min(max, scrollPos + (max * TICK_MS) / (duration * (1 - 2 * SCROLL_PAUSE)));
        current.scrollTop = scrollPos;
      }
    }
    if (elapsed < duration) return;
    const index = release.tabs.findIndex(version => version === active);
    const next = release.tabs[(index + 1) % release.tabs.length];
    if (next !== active) {
      active = next;
      return;
    }
    elapsed = 0;
    scrollPos = 0;
    if (current) current.scrollTop = 0;
  };

  $effect(() => {
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  });

  $effect(() => {
    const target = root?.closest<HTMLElement>('[data-slot="dialog-content"]') ?? root;
    if (!target) return;
    const onInput = () => {
      lastInput = Date.now();
    };
    for (const name of USER_EVENTS) target.addEventListener(name, onInput, { passive: true });
    return () => {
      for (const name of USER_EVENTS) target.removeEventListener(name, onInput);
    };
  });
</script>

{#if release}
  <ScyllaDialog
    open
    onOpenChange={open => {
      if (!open) dismissRelease();
    }}
    class="h-[min(40rem,calc(100dvh-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-lg"
    title={t(layoutMessages.whatsNew(release.line))}
    description={t(layoutMessages.whatsNewDescription)}
  >
    <div
      bind:this={root}
      class="contents"
      role="presentation"
      onfocusin={event => (itemFocused = !!(event.target as Element).closest('[role="tabpanel"]'))}
      onfocusout={() => (itemFocused = false)}
    >
    <Tabs bind:value={active} class="min-h-0 min-w-0 gap-3">
      <div class="flex shrink-0 items-center gap-2">
        <div class="relative min-w-0 flex-1 overflow-x-auto">
        <TabsList class="mx-auto">
          {#each release.tabs as version (version)}
            <TabsTrigger value={version} class="relative px-3">
              {version}
              {#if tabHasNew(version)}
                <span class="size-1.5 rounded-full bg-primary" aria-hidden="true"></span>
                <span class="sr-only">{t(layoutMessages.newBadge)}</span>
              {/if}
            </TabsTrigger>
          {/each}
        </TabsList>
        </div>
        {#if !reduced}
          <Button
            variant="ghost"
            size="icon"
            class="size-8 shrink-0"
            aria-label={userPaused ? t(layoutMessages.playAutoplay) : t(layoutMessages.pauseAutoplay)}
            aria-pressed={userPaused}
            onclick={() => (userPaused = !userPaused)}
          >
            <span class="grid size-4 place-items-center *:col-start-1 *:row-start-1">
              {#if userPaused}
                <span in:swapIn out:swapOut class="flex"><PlayIcon class="size-4" /></span>
              {:else}
                <span in:swapIn out:swapOut class="flex"><PauseIcon class="size-4" /></span>
              {/if}
            </span>
          </Button>
        {/if}
      </div>
      <div class="h-0.5 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          data-testid="whats-new-progress"
          class="h-full origin-left bg-primary"
          class:invisible={reduced}
          style:transform={`scaleX(${progress})`}
        ></div>
      </div>
      {#each release.tabs as version (version)}
        <TabsContent value={version} class="relative min-h-0 overflow-y-auto py-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200"
        >
          <ul class="flex flex-col gap-2">
            {#each release.highlights.filter(highlight => highlight.version === version) as highlight (highlight.id)}
              {@const openable = canOpen(highlight)}
              <li
                class={[
                  'relative flex items-center gap-3 rounded-xl p-2 transition-colors motion-reduce:transition-none',
                  openable &&
                    'group hover:bg-accent has-focus-visible:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring',
                ]}
              >
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                >
                  <highlight.icon class="size-5 text-primary" />
                </span>
                <div class="min-w-0 flex-1">
                  <h4 class="text-sm text-foreground">
                    {#if openable}
                      <button
                        type="button"
                        data-testid="whats-new-item"
                        class="cursor-pointer text-left outline-hidden after:absolute after:inset-0 after:rounded-xl"
                        onclick={() => go(highlight)}
                      >
                        {t(highlight.title)}
                      </button>
                    {:else}
                      {t(highlight.title)}
                    {/if}
                  </h4>
                  <p class="text-sm text-muted-foreground">{t(highlight.description)}</p>
                </div>
                <span class="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                  {#if openable}
                    <ArrowRightIcon
                      class="size-4 text-muted-foreground opacity-0 transition duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 group-has-focus-visible:translate-x-0.5 group-has-focus-visible:opacity-100 pointer-coarse:opacity-60 motion-reduce:transition-none"
                    />
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
        </TabsContent>
      {/each}
    </Tabs>
    </div>

    <DialogFooter>
      <Button onclick={dismissRelease}>{t(layoutMessages.gotIt)}</Button>
    </DialogFooter>
  </ScyllaDialog>
{/if}
