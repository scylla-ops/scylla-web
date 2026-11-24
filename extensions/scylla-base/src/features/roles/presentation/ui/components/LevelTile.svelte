<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { RoleLevel } from '../../../domain/entities/role.entity.ts';
  import { LEVEL_APPEARANCES } from '../../presenters/role-level.presenter.ts';

  let { level, class: className }: { level: RoleLevel; class?: string } = $props();

  const appearance = $derived(LEVEL_APPEARANCES[level]);
</script>

<span
  aria-hidden="true"
  class={cn(
    'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
    appearance.tile,
    className,
  )}
>
  <appearance.icon class="size-1/2" />
</span>
