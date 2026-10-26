<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import ListChecksIcon from '@lucide/svelte/icons/list-checks';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PlayIcon from '@lucide/svelte/icons/play';
  import ZapIcon from '@lucide/svelte/icons/zap';
  import { Permission, can } from '@platform/authz';
  import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { IconButton, getDataTableLayout } from '@scylla/ui';
  import { createCompactContainer } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

  interface Props {
    onRun: (event: MouseEvent) => void;
    onEdit: (event: MouseEvent) => void;
    onDuplicate: (event: MouseEvent) => void;
    onViewJobs?: (event: MouseEvent) => void;
    onViewTriggers?: (event: MouseEvent) => void;
    isRunning?: boolean;
    isDuplicating?: boolean;
  }

  let {
    onRun,
    onEdit,
    onDuplicate,
    onViewJobs,
    onViewTriggers,
    isRunning = false,
    isDuplicating = false,
  }: Props = $props();

  const compact = createCompactContainer();

  const canRun = $derived(can(Permission.RUN_PIPELINE));
  const canEdit = $derived(can(Permission.UPDATE_PIPELINE));
  const canDuplicate = $derived(can(Permission.CREATE_PIPELINE));
  const showTriggers = $derived(!!onViewTriggers && can(Permission.MANAGE_TRIGGERS));

  // A card has no room for five buttons. Run stays out of the menu: it is the main action.
  const layout = getDataTableLayout();
  const asMenu = $derived(compact.isCompact || layout.isCard);
  const runBesideMenu = $derived(layout.isCard && canRun);
</script>

{#snippet runButton()}
  <span data-tour="pipeline-run" class="contents">
    <IconButton
      icon={isRunning ? Loader2Icon : PlayIcon}
      tooltip={t(pipelineMessages.run)}
      onclick={onRun}
      busy={isRunning}
      iconClass={isRunning ? 'animate-spin' : 'fill-current'}
    />
  </span>
{/snippet}

<!-- Falls back to a menu when the column is too narrow. -->
<div {@attach compact.measure} class="flex w-full shrink-0 items-center justify-center gap-2">
  {#if asMenu}
    {#if runBesideMenu}
      {@render runButton()}
    {/if}
    <DropdownMenu>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <Button
            {...props}
            onclick={(event: MouseEvent) => {
              // Opening the menu must not select the row.
              event.stopPropagation();
              (props.onclick as ((e: MouseEvent) => void) | undefined)?.(event);
            }}
            type="button"
            size="icon"
            variant="ghost"
            class="h-8 w-8 shrink-0 rounded-full text-slate-400 hover:text-slate-900"
          >
            <MoreHorizontalIcon class="h-4 w-4" />
            <!-- An icon-only button: this is its name. -->
            <span class="sr-only">{t(pipelineMessages.pipelineActions)}</span>
          </Button>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-40">
        {#if canRun && !runBesideMenu}
          <DropdownMenuItem onclick={onRun}>
            <PlayIcon class="mr-2 h-4 w-4" />
            {t(pipelineMessages.run)}
          </DropdownMenuItem>
        {/if}
        {#if canEdit}
          <DropdownMenuItem onclick={onEdit}>
            <PencilIcon class="mr-2 h-4 w-4" />
            {t(pipelineMessages.edit)}
          </DropdownMenuItem>
        {/if}
        {#if canDuplicate}
          <DropdownMenuItem onclick={onDuplicate}>
            <CopyIcon class="mr-2 h-4 w-4" />
            {t(pipelineMessages.duplicate)}
          </DropdownMenuItem>
        {/if}
        {#if onViewJobs}
          <DropdownMenuItem onclick={onViewJobs}>
            <ListChecksIcon class="mr-2 h-4 w-4" />
            {t(pipelineMessages.viewJobs)}
          </DropdownMenuItem>
        {/if}
        {#if showTriggers}
          <DropdownMenuItem onclick={onViewTriggers}>
            <ZapIcon class="mr-2 h-4 w-4" />
            {t(pipelineMessages.triggers)}
          </DropdownMenuItem>
        {/if}
      </DropdownMenuContent>
    </DropdownMenu>
  {:else}
    {#if canRun}
      {@render runButton()}
    {/if}

    {#if canEdit}
      <IconButton icon={PencilIcon} tooltip={t(pipelineMessages.editPipeline)} onclick={onEdit} />
    {/if}

    {#if canDuplicate}
      <IconButton
        icon={isDuplicating ? Loader2Icon : CopyIcon}
        tooltip={t(pipelineMessages.duplicate)}
        onclick={onDuplicate}
        busy={isDuplicating}
        iconClass={isDuplicating ? 'animate-spin' : undefined}
      />
    {/if}

    {#if onViewJobs}
      <IconButton
        icon={ListChecksIcon}
        tooltip={t(pipelineMessages.viewJobs)}
        onclick={onViewJobs}
      />
    {/if}

    {#if showTriggers}
      <IconButton icon={ZapIcon} tooltip={t(pipelineMessages.triggers)} onclick={onViewTriggers} />
    {/if}
  {/if}
</div>
