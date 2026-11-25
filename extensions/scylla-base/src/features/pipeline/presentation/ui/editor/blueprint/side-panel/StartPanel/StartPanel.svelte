<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import ZapIcon from '@lucide/svelte/icons/zap';
  import { WidgetZone } from '@scylla/core-sdk';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { pipelinePoints } from '@base/features/pipeline/presentation/pipeline.points.ts';

  interface Props {
    pipelineId: string;
    projectId: string;
    onClose: () => void;
  }

  let { pipelineId, projectId, onClose }: Props = $props();
</script>

<!--
  The panel of the start node, in the editor and in the view of a file pipeline: what starts the
  pipeline. `features/triggers` fills its body; with no right to see the triggers, the text below.
-->
<div class="flex h-full min-h-0 flex-col">
  <header class="flex items-center gap-2.5 border-b px-4 py-3">
    <span
      class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
    >
      <ZapIcon class="size-4" aria-hidden="true" />
    </span>
    <h2 class="min-w-0 flex-1 truncate text-sm">{t(blueprintMessages.triggers)}</h2>
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t(blueprintMessages.closePanel)}
      onclick={onClose}
    >
      <XIcon aria-hidden="true" />
    </Button>
  </header>
  <WidgetZone point={pipelinePoints.startPanel} context={{ pipelineId, projectId }}>
    <p class="px-4 py-3 text-sm text-muted-foreground">{t(blueprintMessages.triggersHidden)}</p>
  </WidgetZone>
</div>
