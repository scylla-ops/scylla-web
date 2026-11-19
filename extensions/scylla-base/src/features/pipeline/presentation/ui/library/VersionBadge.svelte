<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';

  interface Props {
    number: number;
    /** Filled: the latest version, or the one that the reader links. */
    filled?: boolean;
  }

  let { number, filled = false }: Props = $props();
</script>

<span
  class={cn(
    'shrink-0 rounded-full border border-info px-1.5 py-0.5 text-[10.5px] font-semibold',
    filled ? 'bg-info text-info-foreground' : 'text-info',
  )}
>
  {t(libraryMessages.version(number))}
</span>
