<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import FileDownIcon from '@lucide/svelte/icons/file-down';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
  import type { LucideIcon } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import { createDataExport } from './data-export.state.svelte.ts';
  import { privacyMessages as m } from '@base/features/user/presentation/messages/privacy.messages.ts';

  const exportation = createDataExport();
</script>

<!-- The icon is centered on the title and the text. -->
{#snippet info(
  Icon: LucideIcon,
  title: MessageDescriptor,
  text: string,
  iconClass = 'text-muted-foreground',
  titleClass = '',
)}
  <div class="flex min-w-0 grow basis-64 items-center gap-3">
    <Icon class={cn('size-4 shrink-0', iconClass)} aria-hidden="true" />
    <div class="flex min-w-0 flex-col gap-0.5">
      <p class={cn('text-sm font-medium', titleClass)}>{t(title)}</p>
      <p class="text-sm text-muted-foreground">{text}</p>
    </div>
  </div>
{/snippet}

<!-- In a narrow card, the buttons go under the text, centered. -->
<div
  class="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-lg border p-4"
  aria-live="polite"
>
  {#if exportation.status === 'preparing'}
    {@render info(LoaderCircleIcon, m.preparing, t(m.preparingText), 'animate-spin text-muted-foreground')}
    <Button variant="outline" disabled>{t(m.preparingButton)}</Button>
  {:else if exportation.status === 'ready' && exportation.file}
    {@const { name, size } = exportation.file}
    {@const text = t(m.readyText(name, size, formatDate(exportation.exportedAt)))}
    {@render info(CircleCheckIcon, m.ready, text, 'text-primary')}
    <div class="flex items-center gap-2">
      <Button variant="ghost" onclick={exportation.start}>{t(m.newExport)}</Button>
      <Button onclick={exportation.download}>
        <DownloadIcon aria-hidden="true" />
        {t(m.download)}
      </Button>
    </div>
  {:else if exportation.status === 'failed'}
    {@const danger = 'text-destructive'}
    {@render info(CircleAlertIcon, m.failed, t(m.failedText), danger, danger)}
    <Button variant="outline" onclick={exportation.start}>
      <RotateCwIcon aria-hidden="true" />
      {t(m.tryAgain)}
    </Button>
  {:else}
    {@render info(FileDownIcon, m.noExport, t(m.exportContents))}
    <Button variant="outline" onclick={exportation.start}>
      <DownloadIcon aria-hidden="true" />
      {t(m.downloadMyData)}
    </Button>
  {/if}
</div>
