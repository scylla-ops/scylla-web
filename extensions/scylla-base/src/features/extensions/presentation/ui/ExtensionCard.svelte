<script lang="ts">
  import PuzzleIcon from '@lucide/svelte/icons/puzzle';
  import { Badge, Card, CardContent } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import type { InstalledExtension } from '../../domain/structs/installed-extension.struct.ts';
  import { extensionsMessages } from './extensions.messages.ts';

  interface Props {
    extension: InstalledExtension;
  }

  let { extension }: Props = $props();
</script>

<Card class="gap-0 py-0">
  <CardContent class="p-4">
    <div class="flex items-start justify-between gap-2">
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-success/30 bg-success/10"
        >
          <PuzzleIcon class="h-4 w-4 text-success" />
        </span>
        <div class="min-w-0">
          <p class="truncate font-semibold">{extension.name}</p>
          <p class="truncate font-mono text-xs text-muted-foreground">{extension.id}</p>
        </div>
      </div>
      <Badge variant="outline" class="shrink-0 font-mono">v{extension.version}</Badge>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {#if extension.dependencies.length === 0}
        <span>{t(extensionsMessages.noDependency)}</span>
      {:else}
        <span>{t(extensionsMessages.dependsOn)}</span>
        {#each extension.dependencies as dependency (dependency)}
          <Badge variant="secondary" class="font-mono">{dependency}</Badge>
        {/each}
      {/if}
    </div>
  </CardContent>

  <div class="flex items-center justify-between border-t border-dashed px-4 py-2.5">
    <span class="font-mono text-xs text-muted-foreground">
      {t(extensionsMessages.moduleCount(extension.moduleCount))} ·
      {t(extensionsMessages.pageCount(extension.pageCount))}
    </span>
    <span class="flex items-center gap-1.5 text-xs text-success">
      <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
      {t(extensionsMessages.active)}
    </span>
  </div>
</Card>
