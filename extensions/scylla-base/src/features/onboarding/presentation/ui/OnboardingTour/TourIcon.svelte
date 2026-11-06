<script lang="ts">
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import PlayIcon from '@lucide/svelte/icons/play';
  import ServerIcon from '@lucide/svelte/icons/server';
  import ShieldIcon from '@lucide/svelte/icons/shield';
  import UsersIcon from '@lucide/svelte/icons/users';
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import ZapIcon from '@lucide/svelte/icons/zap';
  import { cn } from '@scylla/ui/utils';
  import type { TourIcon } from './tour-steps.registry.ts';

  interface Props {
    icon: TourIcon;
    class?: string;
  }

  let { icon, class: className }: Props = $props();

  const ICONS = {
    agent: ServerIcon,
    pipeline: WorkflowIcon,
    run: PlayIcon,
    trigger: ZapIcon,
    secret: KeyRoundIcon,
    role: ShieldIcon,
    users: UsersIcon,
  } as const;

  const Icon = $derived(ICONS[icon]);
</script>

<Icon class={cn('size-4', className)} aria-hidden="true" />
