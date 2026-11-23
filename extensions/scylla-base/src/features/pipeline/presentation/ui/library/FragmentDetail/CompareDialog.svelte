<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { versionDiff } from '@base/features/pipeline/domain/structs/version-diff.struct.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import VersionChanges from './VersionChanges.svelte';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  let { detail }: { detail: FragmentDetail } = $props();

  const comparison = $derived(detail.comparison);
  const changes = $derived(
    comparison ? versionDiff(comparison.from.version, comparison.to.version) : [],
  );
</script>

<ScyllaDialog
  open={comparison !== null}
  onOpenChange={open => {
    if (!open) detail.comparison = null;
  }}
  title={comparison
    ? t(communityMessages.compareTitle(detail.fragment?.name ?? '', comparison.from.label, comparison.to.label))
    : ''}
  description={t(communityMessages.compareDescription)}
  class="sm:max-w-lg"
>
  <VersionChanges {changes} notes={comparison?.to.version.changes} />
  <div class="mt-4 flex justify-end">
    <Button variant="outline" onclick={() => (detail.comparison = null)}>
      {t(communityMessages.close)}
    </Button>
  </div>
</ScyllaDialog>
