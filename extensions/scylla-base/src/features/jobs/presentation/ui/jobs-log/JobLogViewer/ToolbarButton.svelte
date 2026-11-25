<script lang="ts">
  import { buttonVariants, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import type { LucideIcon } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { jobLogMessages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';

  interface Props {
    icon: LucideIcon;
    label: string;
    /** The key that does the same, shown in the tooltip. */
    shortcut?: string;
    /** A toggle: `aria-pressed`. */
    pressed?: boolean;
    disabled?: boolean;
    onclick: () => void;
  }

  let { icon: Icon, label, shortcut, pressed, disabled = false, onclick }: Props = $props();
</script>

<!-- An icon button of the log toolbar. Its label is its name and its tooltip, with its key. -->
<Tooltip>
  <TooltipTrigger
    type="button"
    {disabled}
    aria-pressed={pressed}
    aria-keyshortcuts={shortcut === 'Esc' ? 'Escape' : shortcut}
    {onclick}
    class={cn(
      buttonVariants({ variant: 'ghost', size: 'icon' }),
      'size-8 shrink-0 text-muted-foreground hover:text-foreground',
      pressed && 'bg-primary-subtle text-primary hover:bg-primary-subtle hover:text-primary',
    )}
  >
    <Icon class="size-4" aria-hidden="true" />
    <span class="sr-only">{label}</span>
  </TooltipTrigger>
  <TooltipContent>
    <p class="flex items-center gap-2">
      {label}
      {#if shortcut}
        <kbd
          class="rounded border border-border/60 px-1 font-mono text-[10px]"
          aria-label={t(jobLogMessages.shortcut(shortcut))}
        >
          {shortcut}
        </kbd>
      {/if}
    </p>
  </TooltipContent>
</Tooltip>
