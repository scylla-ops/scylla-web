<script lang="ts">
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import type { MessageDescriptor } from '@lingui/core';
  import { t } from '@scylla/ui/i18n';
  import type { UnfitAgent } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobGitMessages as messages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';

  interface Props {
    agents: UnfitAgent[];
    /** The link of an agent page. Absent: the user may not open it, and the name is plain text. */
    agentHref?: (id: string) => string;
  }

  let { agents, agentHref }: Props = $props();

  const FIX: Record<UnfitAgent['reason'], MessageDescriptor> = {
    'update-agent': messages.unfitUpdate,
    'install-git': messages.unfitInstallGit,
    unknown: messages.unfitUnknown,
  };
</script>

<!-- The job waits, and these agents are online: tell what each one needs. -->
<div
  role="status"
  class="flex items-center gap-2.5 rounded-md border border-warning/60 bg-warning/10 px-3.5 py-2.5"
>
  <TriangleAlertIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
  <div class="flex min-w-0 flex-col gap-1">
    <p class="text-sm font-medium text-foreground">{t(messages.unfitTitle)}</p>
    <ul class="flex flex-col gap-0.5">
      {#each agents as agent (agent.id)}
        <li class="flex flex-wrap items-center gap-x-2 text-xs text-foreground">
          {#if agentHref}
            <a class="font-mono hover:underline" href={agentHref(agent.id)}>{agent.name}</a>
          {:else}
            <span class="font-mono">{agent.name}</span>
          {/if}
          {#if agent.version}
            <span class="font-mono text-muted-foreground">{agent.version}</span>
          {/if}
          <span class="text-muted-foreground">·</span>
          <span>{t(FIX[agent.reason])}</span>
        </li>
      {/each}
    </ul>
  </div>
</div>
