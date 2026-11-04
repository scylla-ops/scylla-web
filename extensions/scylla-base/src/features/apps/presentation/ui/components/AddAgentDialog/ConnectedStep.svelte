<script lang="ts">
  import { scale } from 'svelte/transition';
  import BotIcon from '@lucide/svelte/icons/bot';
  import CheckIcon from '@lucide/svelte/icons/check';
  import { t } from '@scylla/ui/i18n';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    app: AppEntity;
    /** The projects of the agent. Zero: each project. */
    projectCount: number;
  }

  let { app, projectCount }: Props = $props();

  const facts = $derived.by(() => {
    const host = app.host;
    if (!host) return '';
    return [
      `${host.os}/${host.arch}`,
      host.cpuCount ? `${host.cpuCount} CPU` : '',
      host.totalMemoryMb ? `${Math.round(host.totalMemoryMb / 1024)} GB` : '',
      t(messages.jobsAtOnce(host.capacity)),
      host.containerRuntime,
    ]
      .filter(Boolean)
      .join(' · ');
  });
</script>

<div class="flex flex-col items-center gap-3 py-4 text-center">
  <div class="flex items-center gap-3" aria-hidden="true">
    <span class="flex size-11 items-center justify-center rounded-full bg-muted">
      <BotIcon class="size-5" />
    </span>
    <span
      class="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
      in:scale={{ start: 0.5, duration: 300 }}
    >
      <CheckIcon class="size-4" />
    </span>
  </div>
  <p class="text-sm font-medium">{t(messages.connectedFrom(app.host?.hostname ?? app.name))}</p>
  {#if facts}
    <p class="text-xs text-muted-foreground">{facts}</p>
  {/if}
  <p class="text-xs text-muted-foreground">
    {projectCount === 0
      ? t(messages.allProjectsDone)
      : t(messages.someProjectsDone(projectCount))}
  </p>
</div>
