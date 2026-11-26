<script lang="ts">
  import {
    Button,
    DialogFooter,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@scylla/ui/primitives';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    dismissRelease,
    tabHasNew,
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
    <Tabs value={release.tabs[0]} class="min-w-0 gap-3">
      <div class="relative overflow-x-auto">
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
      {#each release.tabs as version (version)}
        <TabsContent value={version} class="relative h-[min(26rem,55vh)] overflow-y-auto py-2">
          <ul class="flex flex-col gap-4">
            {#each release.highlights.filter(highlight => highlight.version === version) as highlight (highlight.id)}
              <li class="flex items-center gap-3">
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                >
                  <highlight.icon class="size-5 text-primary" />
                </span>
                <div class="min-w-0">
                  <h4 class="text-sm text-foreground">{t(highlight.title)}</h4>
                  <p class="text-sm text-muted-foreground">{t(highlight.description)}</p>
                </div>
              </li>
            {/each}
          </ul>
        </TabsContent>
      {/each}
    </Tabs>

    <DialogFooter>
      <Button onclick={dismissRelease}>{t(layoutMessages.gotIt)}</Button>
    </DialogFooter>
  </ScyllaDialog>
{/if}
