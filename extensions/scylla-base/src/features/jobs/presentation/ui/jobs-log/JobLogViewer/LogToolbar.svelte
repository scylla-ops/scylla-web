<script lang="ts">
  import ArrowDownToLineIcon from '@lucide/svelte/icons/arrow-down-to-line';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import Maximize2Icon from '@lucide/svelte/icons/maximize-2';
  import Minimize2Icon from '@lucide/svelte/icons/minimize-2';
  import WrapTextIcon from '@lucide/svelte/icons/wrap-text';
  import type { Attachment } from 'svelte/attachments';
  import {
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { jobLogMessages as messages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';
  import type { LogDisplay } from '../log-display-settings.state.svelte.ts';
  import type { JobLogViewerState } from './job-log-viewer.state.svelte.ts';
  import LogSearch from './LogSearch.svelte';
  import LogSettingsPopover from './LogSettingsPopover.svelte';
  import ToolbarButton from './ToolbarButton.svelte';

  interface Props {
    viewer: JobLogViewerState;
    display: LogDisplay;
    title: string;
    searchField: Attachment<HTMLInputElement>;
    fullscreen: boolean;
    onToggleFullscreen: () => void;
    onDownload: (raw: boolean) => void;
  }

  let {
    viewer,
    display,
    title,
    searchField,
    fullscreen,
    onToggleFullscreen,
    onDownload,
  }: Props = $props();

  const errorCount = $derived(viewer.errors.items.length);
</script>

<!-- The title of the log, its search, its errors, then the actions of the viewer. -->
<div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-card px-3 py-1.5">
  <h2 class="min-w-0 max-w-48 truncate text-sm text-foreground">{title}</h2>

  <LogSearch {viewer} field={searchField} />

  {#if errorCount > 0}
    <div class="flex items-center gap-0.5" role="group" aria-label={t(messages.errors)}>
      <span
        role="status"
        class="flex h-6 items-center gap-1 rounded-full bg-destructive-subtle px-2 text-xs font-medium text-destructive tabular-nums"
      >
        <CircleAlertIcon class="size-3.5 shrink-0" aria-hidden="true" />
        {viewer.errors.index < 0
          ? t(messages.errorCount(errorCount))
          : t(messages.errorOf(viewer.errors.index + 1, errorCount))}
      </span>
      <ToolbarButton
        icon={ChevronUpIcon}
        label={t(messages.previousError)}
        shortcut="Shift+E"
        onclick={viewer.previousError}
      />
      <ToolbarButton
        icon={ChevronDownIcon}
        label={t(messages.nextError)}
        shortcut="E"
        onclick={viewer.nextError}
      />
    </div>
  {/if}

  <div class="ml-auto flex items-center gap-0.5">
    <ToolbarButton
      icon={ArrowDownToLineIcon}
      label={t(messages.follow)}
      pressed={viewer.isFollowing}
      onclick={viewer.toggleFollow}
    />
    <ToolbarButton
      icon={WrapTextIcon}
      label={t(messages.wrap)}
      pressed={display.current.wrap}
      onclick={() => display.set({ wrap: !display.current.wrap })}
    />
    <LogSettingsPopover {display} />
    <DropdownMenu>
      <DropdownMenuTrigger
        class={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'size-8 shrink-0 text-muted-foreground hover:text-foreground',
        )}
      >
        <DownloadIcon class="size-4" aria-hidden="true" />
        <span class="sr-only">{t(messages.download)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <DropdownMenuItem onSelect={() => onDownload(false)}>
          {t(messages.downloadPlain)}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDownload(true)}>
          {t(messages.downloadRaw)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <ToolbarButton
      icon={fullscreen ? Minimize2Icon : Maximize2Icon}
      label={t(fullscreen ? messages.exitFullScreen : messages.fullScreen)}
      shortcut={fullscreen ? 'Esc' : 'F'}
      onclick={onToggleFullscreen}
    />
  </div>
</div>
