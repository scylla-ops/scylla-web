<script lang="ts">
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { Badge } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentsListMessages as messages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  let { agent }: { agent: Pick<AppEntity, 'compatibility'> } = $props();
</script>

<!-- An outdated agent runs only some jobs; the server refuses an unsupported one. -->
{#if agent.compatibility === 'outdated'}
  <Badge
    variant="outline"
    class="items-center justify-center gap-1 border-warning/60 bg-warning/10 text-foreground"
    title={t(messages.updateNeededHint)}
  >
    <TriangleAlertIcon class="text-warning" aria-hidden="true" />
    {t(messages.updateNeeded)}
  </Badge>
{:else if agent.compatibility === 'unsupported'}
  <Badge
    variant="destructive"
    class="items-center justify-center gap-1"
    title={t(messages.incompatibleHint)}
  >
    <TriangleAlertIcon aria-hidden="true" />
    {t(messages.incompatible)}
  </Badge>
{/if}
