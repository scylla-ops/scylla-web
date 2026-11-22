<script lang="ts">
  import { Label, Switch } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';

  interface Props {
    /** The node shows its error output: the toggle is on, or a need names it. */
    checked: boolean;
    /** Off removes the links of the error output; the view offers to undo it. */
    onCheckedChange: (on: boolean) => void;
  }

  let { checked, onCheckedChange }: Props = $props();

  const uid = $props.id();
</script>

<!-- The error output of a node that runs a step. It is not saved: a link from it is. -->
<div class="flex flex-col gap-1">
  <div class="flex items-center gap-2">
    <Switch id={uid} {checked} {onCheckedChange} aria-describedby="{uid}-hint" />
    <Label for={uid}>{t(nodeMessages.errorOutput)}</Label>
  </div>
  <p id="{uid}-hint" class="text-xs text-muted-foreground">{t(nodeMessages.errorOutputHint)}</p>
</div>
