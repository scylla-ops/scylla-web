<script lang="ts">
  import { untrack } from 'svelte';
  import { currentPathname } from '@platform/context';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { layoutMessages } from '../../layout/messages/layout.messages.ts';
  import { syncWorkspace } from '../workspace-sync.effect.svelte.ts';

  // A URL inside a workspace (`/<workspace>/xyz`) shows in the shell: the first segment names the
  // workspace, which the shell needs for its rail. Another URL shows alone.
  const segments = untrack(() => currentPathname().split('/').filter(Boolean));
  const workspace = segments.length > 1 ? syncWorkspace(segments[0]) : undefined;
</script>

{#if !workspace || workspace.matched}
  <div class="flex h-full min-h-64 flex-col items-center justify-center gap-4 p-4 text-center">
    <div class="space-y-2">
      <h2 class="text-lg">{t(layoutMessages.notFound)}</h2>
      <p class="text-sm text-muted-foreground">{t(layoutMessages.notFoundBody)}</p>
    </div>
    <Button variant="outline" href="/">{t(layoutMessages.openScylla)}</Button>
  </div>
{/if}
