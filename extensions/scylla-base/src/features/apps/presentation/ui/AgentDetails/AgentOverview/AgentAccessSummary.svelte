<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Skeleton,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { AgentLabels } from '@shared/presentation/ui';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import type { AgentAccess } from '@base/features/apps/domain/structs/agent-access.struct.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    agent: Pick<AppEntity, 'labels' | 'automaticLabels'>;
    /** `undefined` while it loads. */
    access: AgentAccess | undefined;
    /** `list_workspace_members`: without it, the card shows the labels only. */
    canReadAccess: boolean;
    workspaceName: string;
    /** Opens the Settings tab. */
    onManage: () => void;
  }

  let { agent, access, canReadAccess, workspaceName, onManage }: Props = $props();
</script>

<Card class="gap-4">
  <CardHeader class="flex flex-row items-center justify-between gap-3">
    <CardTitle>
      <h2>{t(canReadAccess ? messages.accessAndLabels : messages.labels)}</h2>
    </CardTitle>
    <Button variant="ghost" size="sm" class="-my-1" onclick={onManage}>
      {t(messages.manage)}
      <ChevronRightIcon class="size-4" aria-hidden="true" />
    </Button>
  </CardHeader>
  <CardContent class="flex flex-col gap-3 text-sm">
    {#if canReadAccess}
      {#if !access}
        <Skeleton class="h-5 w-40" />
      {:else if access.kind === 'none'}
        <p class="flex items-center gap-2" role="status">
          <TriangleAlertIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
          {t(messages.noAccess)}
        </p>
      {:else}
        <p class="flex min-w-0 items-center gap-2">
          <FolderIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="min-w-0 truncate">
            {access.kind === 'all'
              ? t(messages.allProjectsOf(workspaceName))
              : access.projects.map(project => project.name).join(', ')}
          </span>
        </p>
      {/if}
    {/if}
    {#if agent.labels.length || agent.automaticLabels.length}
      <AgentLabels
        labels={agent.labels}
        automatic={agent.automaticLabels}
        label={t(messages.labels)}
      />
    {:else}
      <p class="text-xs text-muted-foreground">{t(messages.noAdminLabel)}</p>
    {/if}
  </CardContent>
</Card>
