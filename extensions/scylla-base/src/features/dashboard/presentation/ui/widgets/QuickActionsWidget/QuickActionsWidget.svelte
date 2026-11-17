<script lang="ts">
  import PlayIcon from '@lucide/svelte/icons/play';
  import ServerIcon from '@lucide/svelte/icons/server';
  import UserPlusIcon from '@lucide/svelte/icons/user-plus';
  import ZapIcon from '@lucide/svelte/icons/zap';
  import { Permission, can } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import { Widget, WidgetState, type LucideIcon } from '@scylla/ui';
  import { Button, Popover, PopoverContent, PopoverTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { createRunPipeline } from '@base/features/pipeline';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';

  interface Props {
    widgets: DashboardWidgets;
  }

  let { widgets }: Props = $props();

  const runner = createRunPipeline();

  let picking = $state(false);

  const canRun = $derived(can(Permission.RUN_PIPELINE) && widgets.canReadPipelines);
  const canAddAgent = $derived(can(Permission.CREATE_APP));
  const canInvite = $derived(can(Permission.ADD_WORKSPACE_MEMBER));
  const pipelines = $derived(
    [...(widgets.summaries.data?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
  );

  const run = (pipelineId: string) => {
    picking = false;
    void runner.run(pipelineId);
  };
</script>

<Widget size="m" title={t(messages.quickActions)} icon={ZapIcon as LucideIcon}>
  {#if !canRun && !canAddAgent && !canInvite}
    <WidgetState state="locked" size="m" description={t(messages.noActionAllowed)} />
  {:else}
    <div class="flex flex-1 flex-wrap content-center justify-center gap-2">
      {#if canRun}
        <Popover bind:open={picking}>
          <PopoverTrigger>
            {#snippet child({ props })}
              <Button variant="outline" {...props}>
                <PlayIcon aria-hidden="true" />
                {t(messages.runPipeline)}
              </Button>
            {/snippet}
          </PopoverTrigger>
          <PopoverContent align="start" class="w-64 p-1">
            <p class="px-2 py-1.5 text-xs text-muted-foreground">{t(messages.choosePipeline)}</p>
            <ul class="relative max-h-64 overflow-y-auto">
              {#each pipelines as pipeline (pipeline.id)}
                <li>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                    disabled={runner.isRunning(pipeline.id)}
                    onclick={() => run(pipeline.id)}
                  >
                    <span class="truncate">{pipeline.name}</span>
                    <span class="ml-auto truncate text-xs text-muted-foreground">
                      {pipeline.projectName}
                    </span>
                  </button>
                </li>
              {:else}
                <li class="px-2 py-1.5 text-sm text-muted-foreground">{t(messages.noPipelinesYet)}</li>
              {/each}
            </ul>
          </PopoverContent>
        </Popover>
      {/if}
      {#if canAddAgent}
        <Button variant="outline" onclick={() => scyllaNavigate.goToWorkspaceRoute('/agents/new')}>
          <ServerIcon aria-hidden="true" />
          {t(messages.addAgent)}
        </Button>
      {/if}
      {#if canInvite}
        <Button variant="outline" onclick={() => scyllaNavigate.goToWorkspaceRoute('/members')}>
          <UserPlusIcon aria-hidden="true" />
          {t(messages.inviteMember)}
        </Button>
      {/if}
    </div>
  {/if}
</Widget>
