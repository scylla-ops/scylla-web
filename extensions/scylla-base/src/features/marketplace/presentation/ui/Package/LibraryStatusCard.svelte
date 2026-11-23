<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import type { PackagePage } from './package-page.state.svelte.ts';

  let { page }: { page: PackagePage } = $props();

  const text = $derived.by(() => {
    const { status, workspaceName } = page;
    switch (status.kind) {
      case 'none':
        return {
          title: marketplaceMessages.notInLibraryTitle(workspaceName),
          detail: marketplaceMessages.notInLibrary(workspaceName),
        };
      case 'linked':
        return {
          title: marketplaceMessages.linkedTitle(workspaceName, status.version),
          detail: marketplaceMessages.linkedDetail,
        };
      case 'forked':
        return {
          title: marketplaceMessages.forkedTitle(workspaceName, status.fragment.name),
          detail: marketplaceMessages.forkedDetail,
        };
      case 'own':
        return {
          title: marketplaceMessages.ownTitle(workspaceName),
          detail: marketplaceMessages.ownDetail,
        };
    }
  });
</script>

<!-- Where the package stands in the library: the first thing a reader checks before adding. -->
<section
  class={cn(
    'flex flex-col gap-1 rounded-xl border p-4',
    page.status.kind === 'none' ? 'border-info/40 bg-info/10' : 'bg-muted/50',
  )}
>
  <h2 class="text-sm">{t(text.title)}</h2>
  <p class="text-xs text-muted-foreground">{t(text.detail)}</p>
</section>
