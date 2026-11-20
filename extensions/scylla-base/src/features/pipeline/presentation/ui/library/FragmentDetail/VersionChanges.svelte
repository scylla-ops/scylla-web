<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { VersionChange } from '@base/features/pipeline/domain/structs/version-diff.struct.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import {
    versionChangeMessage,
    versionChangeSign,
  } from '@base/features/pipeline/presentation/presenters/fragment-community.presenter.ts';

  interface Props {
    changes: VersionChange[];
    /** The notes of the publisher, after the changes that the client finds. */
    notes?: string[];
  }

  let { changes, notes = [] }: Props = $props();

  const SIGN_CLASS = { '+': 'text-primary', '-': 'text-destructive', '~': 'text-warning' } as const;
</script>

<ul class="flex flex-col gap-1 text-sm">
  {#each changes as change, index (index)}
    {@const sign = versionChangeSign(change)}
    <li class="flex gap-2">
      <span class={cn('w-3 shrink-0 font-mono', SIGN_CLASS[sign])} aria-hidden="true">{sign}</span>
      <span class="font-mono text-xs leading-5">{t(versionChangeMessage(change))}</span>
    </li>
  {/each}
  {#each notes as note (note)}
    <li class="flex gap-2 text-muted-foreground">
      <span class="w-3 shrink-0" aria-hidden="true">·</span>
      <span>{note}</span>
    </li>
  {/each}
  {#if !changes.length && !notes.length}
    <li class="text-muted-foreground">{t(communityMessages.noDifference)}</li>
  {/if}
</ul>
