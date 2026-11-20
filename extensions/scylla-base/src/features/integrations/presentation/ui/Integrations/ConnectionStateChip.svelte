<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CirclePauseIcon from '@lucide/svelte/icons/circle-pause';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import UnplugIcon from '@lucide/svelte/icons/unplug';
  import { Badge } from '@scylla/ui/primitives';
  import type { ConnectionState } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
  import {
    stateLabel,
    stateTone,
  } from '@base/features/integrations/presentation/presenters/connection.presenter.ts';

  interface Props {
    state: ConnectionState;
  }

  let { state }: Props = $props();

  const ICONS = {
    active: CircleCheckIcon,
    suspended: CirclePauseIcon,
    needs_attention: TriangleAlertIcon,
    disconnected: UnplugIcon,
  } as const;

  const TONES = {
    success: '[&>svg]:text-success',
    warning: '[&>svg]:text-warning',
    destructive: '[&>svg]:text-destructive',
    muted: '[&>svg]:text-muted-foreground',
  } as const;

  const Icon = $derived(ICONS[state]);
</script>

<Badge variant="outline" class={TONES[stateTone(state)]} data-state={state}>
  <Icon aria-hidden="true" />
  {stateLabel(state)}
</Badge>
