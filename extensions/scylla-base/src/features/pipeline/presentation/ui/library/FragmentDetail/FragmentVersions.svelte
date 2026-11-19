<script lang="ts">
  import InfoIcon from '@lucide/svelte/icons/info';
  import { Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { latestVersion, type FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import VersionHistory from '../VersionHistory.svelte';

  interface Props {
    fragment: FragmentEntity;
  }

  let { fragment }: Props = $props();

  const newestFirst = $derived([...fragment.versions].reverse());
</script>

<!-- A new version comes from the editor: the nodes saved under the name of the fragment. -->
<Card class="flex flex-col gap-4 p-4">
  <h2>{t(libraryMessages.versions)}</h2>
  <VersionHistory
    versions={newestFirst}
    current={latestVersion(fragment).number}
    usages={fragment.usages}
  />
  <p class="flex gap-2 rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
    <InfoIcon class="mt-px size-3.5 shrink-0" />
    {t(libraryMessages.publishPolicy(fragment.author.name))}
  </p>
</Card>
