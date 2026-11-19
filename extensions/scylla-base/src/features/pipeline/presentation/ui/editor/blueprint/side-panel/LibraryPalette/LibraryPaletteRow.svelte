<script lang="ts">
  import { latestVersion, type FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { nodesLine } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';
  import VersionBadge from '@base/features/pipeline/presentation/ui/library/VersionBadge.svelte';
  import FragmentIcon from '../../catalog/FragmentIcon.svelte';

  interface Props {
    fragment: FragmentEntity;
  }

  let { fragment }: Props = $props();

  const latest = $derived(latestVersion(fragment));
</script>

<FragmentIcon />
<span class="min-w-0 flex-1">
  <span class="block truncate text-[13px] font-medium">{fragment.name}</span>
  <span class="block truncate font-mono text-[11.5px] text-muted-foreground">
    {nodesLine(latest.nodes)}
  </span>
</span>
<VersionBadge number={latest.number} />
