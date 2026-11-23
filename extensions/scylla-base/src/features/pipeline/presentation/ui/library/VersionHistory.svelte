<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { FragmentUsage, FragmentVersion } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { VersionBadge } from '@shared/presentation/ui';

  interface Props {
    /** The newest first. */
    versions: FragmentVersion[];
    /** The version that the reader links: its badge is filled. */
    current?: number;
    /** With them, each version says how many pipelines link it. */
    usages?: FragmentUsage[];
    /** One line per version: no changes. */
    compact?: boolean;
  }

  let { versions, current, usages, compact = false }: Props = $props();

  const usageCount = (number: number) => usages?.filter(usage => usage.version === number).length ?? 0;
</script>

<ol class={cn('flex flex-col', compact ? 'gap-2' : 'gap-3.5')}>
  {#each versions as version (version.number)}
    <li class="flex items-start gap-2.5 text-xs">
      <span class="mt-px"><VersionBadge number={version.number} filled={version.number === current} /></span>
      <div class="min-w-0 flex-1">
        <p class="flex flex-wrap items-baseline gap-x-1.5">
          <span class="font-medium text-foreground">{version.author.name}</span>
          {#if compact}
            <span class="ml-auto text-muted-foreground">{getRelativeTime(version.publishedAt)}</span>
          {:else}
            <span class="text-muted-foreground">· {getRelativeTime(version.publishedAt)}</span>
            {#if usages}
              <span class="text-muted-foreground">· {t(libraryMessages.versionUsage(usageCount(version.number)))}</span>
            {/if}
          {/if}
        </p>
        {#if !compact}
          {#each version.changes as change (change)}
            <p class="text-muted-foreground">{change}</p>
          {/each}
        {/if}
      </div>
    </li>
  {/each}
</ol>
