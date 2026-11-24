<script lang="ts">
  import { Badge } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { agentLabelsMessages as messages } from '@shared/presentation/messages/agent-labels.messages.ts';

  interface Props {
    /** The labels that the admins gave, or that a job or a pipeline asks. */
    labels: readonly string[];
    /** The labels from the machine of an agent. They come after the others, in outline. */
    automatic?: readonly string[];
    /** The name of the list, for a screen reader. */
    label?: string;
  }

  let { labels, automatic = [], label }: Props = $props();
</script>

<ul class="flex flex-wrap items-center gap-1" aria-label={label}>
  {#each labels as one (one)}
    <li class="flex">
      <Badge variant="secondary" class="h-4.5 font-mono">
        <span class="[text-box:trim-both_cap_alphabetic]">{one}</span>
      </Badge>
    </li>
  {/each}
  {#each automatic as one (one)}
    <li class="flex" title={t(messages.fromMachineHint)}>
      <Badge variant="outline" class="h-4.5 font-mono text-muted-foreground">
        <span class="[text-box:trim-both_cap_alphabetic]">{one}</span>
      </Badge>
    </li>
  {/each}
</ul>
