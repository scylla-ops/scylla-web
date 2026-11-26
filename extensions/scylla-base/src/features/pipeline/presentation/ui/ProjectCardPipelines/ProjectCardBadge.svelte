<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import { Badge } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectCardContext } from '@base/features/project';
  import { projectCardMessages } from '../../messages/project-card.messages.ts';
  import { createProjectCardPipelines } from './project-card-pipelines.state.svelte.ts';

  interface Props {
    context: ProjectCardContext;
  }

  let { context }: Props = $props();

  const card = createProjectCardPipelines(() => context);
</script>

<!-- After the name of the project: its failing pipelines. -->
{#if card.pipelines.failing > 0}
  <Badge variant="destructive" class="shrink-0" data-part="project-failing">
    <CircleAlertIcon aria-hidden="true" />
    {t(projectCardMessages.failing(card.pipelines.failing))}
  </Badge>
{/if}
