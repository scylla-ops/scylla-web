<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { copyToClipboard } from '@scylla/ui/utils';
  import {
    fragmentReference,
    latestVersion,
    type FragmentEntity,
  } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import FragmentIcon from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/FragmentIcon.svelte';
  import FavoriteButton from '../FavoriteButton.svelte';
  import VersionBadge from '../VersionBadge.svelte';

  interface Props {
    fragment: FragmentEntity;
  }

  let { fragment }: Props = $props();
</script>

<header class="flex flex-wrap items-start gap-4">
  <FragmentIcon class="size-12 [&>svg]:size-6" />
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex items-center gap-2">
      <h1 class="truncate">{fragment.name}</h1>
      <VersionBadge number={latestVersion(fragment).number} filled />
      <span class="rounded-full border px-2 py-0.5 text-xs font-medium">{t(libraryMessages.organization)}</span>
    </div>
    <p class="text-sm text-muted-foreground">
      {fragment.description} · {t(libraryMessages.byAuthor(fragment.author.name))}
    </p>
  </div>
  <div class="flex shrink-0 items-center gap-2">
    <FavoriteButton {fragment} labelled />
    <Button variant="outline" onclick={() => void copyToClipboard(fragmentReference(fragment))}>
      <CopyIcon class="size-4" />
      {t(libraryMessages.copyReference)}
    </Button>
  </div>
</header>
