<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentStatusOf } from '@base/features/apps/domain/structs/agent-list.struct.ts';
  import AgentStatusPill from '../AgentStatusPill/AgentStatusPill.svelte';
  import Sparkline from '../Sparkline/Sparkline.svelte';
  import { agentsListMessages as messages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    agent: AppEntity;
    /** Empty: the user may not read the access. */
    access: string;
    /** The jobs of each day. Empty with no job. */
    jobs: readonly number[];
    total: number;
    onOpen: () => void;
    /** Absent: the user may not make a join code. */
    onShowCommand?: () => void;
  }

  let { agent, access, jobs, total, onOpen, onShowCommand }: Props = $props();

  const status = $derived(agentStatusOf(agent));
  const place = $derived(
    status === 'offline' && agent.lastSeenAt
      ? t(messages.lastSeen(getRelativeTime(agent.lastSeenAt)))
      : (agent.host?.hostname ?? ''),
  );
</script>

<article class="flex flex-col gap-2 rounded-xl border p-4 text-sm">
  <div class="flex items-center justify-between gap-2">
    <button
      type="button"
      class="min-w-0 truncate text-left font-mono font-medium hover:underline"
      onclick={onOpen}
    >
      {agent.name}
    </button>
    <AgentStatusPill {agent} />
  </div>
  {#if status === 'never' && onShowCommand}
    <button
      type="button"
      class="self-start text-xs text-primary hover:underline"
      onclick={onShowCommand}
    >
      {t(messages.showCommand)}
    </button>
  {:else if place}
    <span class="text-xs text-muted-foreground">{place}</span>
  {/if}
  <div class="flex items-center justify-between gap-3">
    <span class="flex min-w-0 items-center gap-2 text-xs">
      {#if access}
        <FolderIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="truncate">{access}</span>
      {/if}
    </span>
    {#if total > 0}
      <span class="flex shrink-0 items-center gap-2">
        <Sparkline values={jobs} label={t(messages.jobsTotal(total))} />
        <span class="font-mono text-xs tabular-nums">{total}</span>
      </span>
    {:else}
      <span class="text-muted-foreground" title={t(messages.noJob)}>–</span>
    {/if}
  </div>
</article>
