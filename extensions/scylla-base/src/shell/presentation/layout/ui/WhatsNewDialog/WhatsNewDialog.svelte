<script lang="ts">
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    dismissRelease,
    unseenRelease,
  } from '@base/shell/presentation/layout/whats-new.state.svelte.ts';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';

  const release = $derived(unseenRelease());
</script>

{#if release}
  <ScyllaDialog
    open
    onOpenChange={open => {
      if (!open) dismissRelease();
    }}
    class="sm:max-w-lg"
    title={t(layoutMessages.whatsNew(release.line))}
    description={t(layoutMessages.whatsNewDescription)}
  >
    <div class="relative flex max-h-[60vh] flex-col gap-5 overflow-y-auto py-2">
      {#each release.groups as group (group.since)}
        <section class="flex flex-col gap-3" aria-labelledby={`whats-new-${group.since}`}>
          <h3 id={`whats-new-${group.since}`} class="text-xs uppercase text-muted-foreground">
            {t(group.title)}
          </h3>
          <ul class="flex flex-col gap-4">
            {#each release.highlights.filter(highlight => highlight.since === group.since) as highlight (highlight.id)}
              <li class="flex items-center gap-3">
                <span
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                >
                  <highlight.icon class="size-4 text-primary" />
                </span>
                <div class="min-w-0">
                  <h4 class="text-sm text-foreground">{t(highlight.title)}</h4>
                  <p class="text-sm text-muted-foreground">{t(highlight.description)}</p>
                </div>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>

    <DialogFooter>
      <Button onclick={dismissRelease}>{t(layoutMessages.gotIt)}</Button>
    </DialogFooter>
  </ScyllaDialog>
{/if}
