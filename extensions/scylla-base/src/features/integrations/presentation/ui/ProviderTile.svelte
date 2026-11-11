<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import { ProviderMark } from '@shared/presentation/ui';
  import type { VcsProvider } from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';

  interface Props {
    provider: VcsProvider;
    class?: string;
  }

  let { provider, class: className }: Props = $props();
</script>

<span
  class={cn(
    'flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background',
    className,
  )}
  aria-hidden="true"
>
  <ProviderMark kind={provider} />
</span>
