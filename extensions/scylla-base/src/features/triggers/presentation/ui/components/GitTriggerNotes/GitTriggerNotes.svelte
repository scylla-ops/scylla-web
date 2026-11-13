<script lang="ts">
  import GitCommitHorizontalIcon from '@lucide/svelte/icons/git-commit-horizontal';
  import GitForkIcon from '@lucide/svelte/icons/git-fork';
  import type { VcsProvider } from '@base/features/integrations';
  import { gitNotes } from '@base/features/triggers/presentation/presenters/trigger-source.presenter.ts';

  interface Props {
    provider?: VcsProvider;
  }

  let { provider }: Props = $props();

  const notes = $derived(gitNotes(provider));
</script>

<!-- Fixed rules, not options: the forks wait for an approval, and one commit has one run. -->
<ul class="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
  <li class="flex items-center gap-2.5">
    <GitForkIcon class="size-4 shrink-0 text-muted-foreground" />
    <span>{notes.fork}</span>
  </li>
  <li class="flex items-center gap-2.5">
    <GitCommitHorizontalIcon class="size-4 shrink-0 text-muted-foreground" />
    <span>{notes.oneRun}</span>
  </li>
</ul>
