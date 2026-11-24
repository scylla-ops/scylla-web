<script lang="ts">
  import type { RepositoryLink } from '@base/features/integrations';
  import type { GitKind } from '@base/features/triggers/domain/entities/trigger.entity.ts';
  import { gitVariables } from '@base/features/triggers/presentation/presenters/trigger-source.presenter.ts';

  interface Props {
    kind: GitKind;
    link?: RepositoryLink | null;
  }

  let { kind, link }: Props = $props();

  const variables = $derived(gitVariables(kind, link));
</script>

<dl class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-6 gap-y-2 rounded-lg border px-4 py-3">
  {#each variables as variable (variable.name)}
    <dt class="font-mono text-xs">{variable.name}</dt>
    <dd class="truncate text-xs text-muted-foreground">{variable.description}</dd>
  {/each}
</dl>
