<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';

  interface Props {
    /** The cards that the button adds. */
    next: number;
    shown: number;
    total: number;
    /** The next cards load. */
    busy: boolean;
    phone: boolean;
    onShowMore: () => void;
  }

  let { next, shown, total, busy, phone, onShowMore }: Props = $props();
</script>

<!-- No page numbers: the next cards come under the others. -->
<div
  class={cn(
    'flex items-center justify-center pt-1',
    phone ? 'flex-col gap-1.5' : 'flex-row gap-3',
  )}
  data-part="project-show-more"
>
  <Button
    variant="outline"
    class={cn(phone && 'h-11 w-full')}
    disabled={busy}
    aria-busy={busy || undefined}
    onclick={onShowMore}
  >
    {t(projectMessages.showMore(next))}
  </Button>
  <span class="text-xs text-muted-foreground">{t(projectMessages.shownOf(shown, total))}</span>
</div>
