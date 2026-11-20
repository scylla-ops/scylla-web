<script lang="ts">
  import { scale } from 'svelte/transition';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import ServerIcon from '@lucide/svelte/icons/server';
  import { Badge, Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    app: AppEntity;
    /** The projects of the agent. Zero: each project. `null`: not known here. */
    projectCount: number | null;
    onOpen: () => void;
    onAddAnother: () => void;
  }

  let { app, projectCount, onOpen, onAddAnother }: Props = $props();

  const facts = $derived.by(() => {
    const host = app.host;
    if (!host) return [];
    return [
      `${host.os}/${host.arch}`,
      host.cpuCount ? `${host.cpuCount} CPU` : '',
      host.totalMemoryMb ? `${Math.round(host.totalMemoryMb / 1024)} GB` : '',
      t(messages.jobsAtOnce(host.capacity)),
      host.containerRuntime,
    ].filter(Boolean);
  });
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-3 rounded-lg border p-4">
    <div class="flex items-center gap-3">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary"
        aria-hidden="true"
        in:scale={{ start: 0.6, duration: 300 }}
      >
        <ServerIcon class="size-5" />
      </span>
      <span class="flex flex-col">
        <span class="text-sm font-medium">
          {t(messages.connectedFrom(app.host?.hostname ?? app.name))}
        </span>
        <span class="text-xs text-muted-foreground">{t(messages.onlineNow)}</span>
      </span>
    </div>
    {#if facts.length}
      <ul class="flex flex-wrap gap-2">
        {#each facts as fact (fact)}
          <li class="flex"><Badge variant="secondary" class="font-normal">{fact}</Badge></li>
        {/each}
      </ul>
    {/if}
    {#if projectCount !== null}
      <p class="flex items-center gap-2 text-xs text-muted-foreground">
        <FolderIcon class="size-4" aria-hidden="true" />
        {projectCount === 0
          ? t(messages.allProjectsDone)
          : t(messages.someProjectsDone(projectCount))}
      </p>
    {/if}
  </div>
  <div class="flex flex-wrap gap-2">
    <Button type="button" onclick={onOpen} data-tour="agent-open">{t(messages.openAgent)}</Button>
    <Button type="button" variant="outline" onclick={onAddAnother}>{t(messages.addAnother)}</Button>
  </div>
</div>
