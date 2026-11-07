<script lang="ts">
  import { Input } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { switchPortIssueText } from '@base/features/pipeline/presentation/presenters/node-issue.presenter.ts';

  interface Props {
    value: string;
    label: string;
    /**
     * On blur or Enter: the needs on the port follow its new name. The draft keeps the old name for
     * an empty one and for `error`.
     */
    onCommit: (name: string) => void;
    class?: string;
  }

  let { value, label, onCommit, class: className }: Props = $props();

  const uid = $props.id();

  // What is typed, until the field is left: then the port shows the name it really got.
  let typed = $state<string | null>(null);
  // Said as it is typed, before the field is left.
  const issue = $derived(switchPortIssueText(typed ?? value));

  const commit = () => {
    if (typed !== null) onCommit(typed);
    typed = null;
  };
</script>

<div class={cn('flex min-w-0 flex-col gap-1', className)}>
  <Input
    value={typed ?? value}
    aria-label={label}
    aria-invalid={!!issue}
    aria-describedby={issue ? `${uid}-issue` : undefined}
    class="h-8 font-mono"
    oninput={event => (typed = event.currentTarget.value)}
    onblur={commit}
    onkeydown={event => event.key === 'Enter' && event.currentTarget.blur()}
  />
  {#if issue}
    <p id="{uid}-issue" class="text-xs text-destructive">{issue}</p>
  {/if}
</div>
