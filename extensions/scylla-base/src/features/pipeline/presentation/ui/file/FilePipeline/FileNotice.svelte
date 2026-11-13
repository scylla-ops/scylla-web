<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import LockIcon from '@lucide/svelte/icons/lock';
  import { Badge, buttonVariants } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { fileMessages } from '@base/features/pipeline/presentation/messages/file.messages.ts';
  import {
    fileNotice,
    providerName,
    shortSha,
  } from '@base/features/pipeline/presentation/presenters/pipeline-file.presenter.ts';
  import type { FilePipeline } from './file-pipeline.state.svelte.ts';

  interface Props {
    view: FilePipeline;
  }

  let { view }: Props = $props();

  const notice = $derived(
    fileNotice({
      path: view.path,
      branch: view.branch,
      commitSha: view.file?.commitSha ?? '',
      errorCount: view.errors.length,
      unreadable: view.unreadable,
      notFound: view.notFound,
    }),
  );

  const url = $derived(view.file?.url ?? '');
  const linkLabel = $derived(
    view.errors.length > 0
      ? t(fileMessages.viewFileAt(shortSha(view.file?.commitSha ?? '')))
      : t(fileMessages.viewFileOn(providerName(view.link?.provider ?? 'github'))),
  );
</script>

<!--
  The notice of a read-only canvas, in the look of the notice of the repeated ids. Beside the
  toolbar of the canvas when both fit (848 px: 16 + 512 + 16 + the toolbar), else under it.
-->
<div
  role={notice.tone === 'error' ? 'alert' : 'note'}
  class={cn(
    'absolute inset-x-4 top-16 z-10 flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm shadow-xs @min-[848px]:top-3 @min-[848px]:right-auto @min-[848px]:max-w-lg',
    notice.tone === 'error' && 'border-destructive/40',
  )}
>
  <Badge variant="outline">
    <LockIcon aria-hidden="true" />
    {t(fileMessages.readOnly)}
  </Badge>
  <p class={cn('min-w-0 flex-1 break-words', notice.tone === 'error' && 'text-destructive')}>
    {notice.text}
  </p>
  {#if url}
    <a
      class={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'shrink-0 px-0')}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {linkLabel}
      <ExternalLinkIcon aria-hidden="true" />
    </a>
  {/if}
</div>
