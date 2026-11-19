<script lang="ts">
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { FragmentEntity, FragmentVersion } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';

  interface Props {
    fragment: FragmentEntity;
    version: FragmentVersion;
    onReview: () => void;
  }

  let { fragment, version, onReview }: Props = $props();
</script>

<!-- Over the canvas: a block can take a newer version. It is proposed, never applied by itself. -->
<div
  role="status"
  class="absolute top-4 left-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-lg border border-warning/50 bg-card px-3 py-2 text-sm shadow-xs"
>
  <RefreshCwIcon class="size-4 shrink-0 text-warning" />
  <span class="font-medium">{t(libraryMessages.available(fragment.name, version.number))}</span>
  <span class="hidden truncate text-xs text-muted-foreground @2xl:inline">
    {t(libraryMessages.publishedBy(version.author.name, getRelativeTime(version.publishedAt)))}
  </span>
  <Button size="xs" variant="outline" onclick={onReview}>{t(libraryMessages.review)}</Button>
</div>
