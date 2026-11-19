<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { FragmentVersion } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';

  interface Props {
    proposed: FragmentVersion;
    current: number;
    onSwitch: () => void;
    onStay: () => void;
  }

  let { proposed, current, onSwitch, onStay }: Props = $props();
</script>

<!-- A newer version, proposed: the pipeline takes it, or stays on its version. -->
<section class="mx-4 rounded-lg border border-warning/50 bg-warning/10 p-3">
  <p class="flex items-center gap-2 text-[13px] font-semibold">
    <RefreshCwIcon class="size-3.5" />
    {t(libraryMessages.versionAvailable(proposed.number))}
    <span class="ml-auto text-xs font-normal text-muted-foreground">
      {getRelativeTime(proposed.publishedAt)}
    </span>
  </p>
  <ul class="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs">
    {#each proposed.changes as change (change)}
      <li>{change}</li>
    {/each}
  </ul>
  <p class="mt-2 flex items-center gap-1.5 text-xs text-primary">
    <CheckIcon class="size-3.5" />
    {t(libraryMessages.valuesKept)}
  </p>
  <div class="mt-3 grid grid-cols-2 gap-2">
    <Button size="sm" onclick={onSwitch}>{t(libraryMessages.switchTo(proposed.number))}</Button>
    <Button size="sm" variant="outline" onclick={onStay}>{t(libraryMessages.stayOn(current))}</Button>
  </div>
</section>
