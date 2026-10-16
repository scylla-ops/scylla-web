<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { StepInspector } from './step-inspector.state.svelte.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
  import { nodeIdIssueText } from '@base/features/pipeline/presentation/ui/editor/blueprint/nodes/node-view.ts';

  interface Props {
    inspector: StepInspector;
  }

  let { inspector }: Props = $props();

  const uid = $props.id();

  const useSuggestion = (id: string) => {
    inspector.id = id;
    inspector.rename();
  };
</script>

<!-- The id of the step, checked as it is typed against the rule of the server. -->
<div class="flex min-w-0 flex-1 flex-col">
  <label class="flex flex-col">
    <span class="text-[11px] text-muted-foreground">{t(blueprintMessages.stepId)}</span>
    <input
      class={cn(
        '-ml-1 rounded-md border border-transparent bg-transparent px-1 text-base font-semibold outline-none hover:border-border focus:border-primary',
        inspector.idIssue && 'border-destructive! text-destructive',
      )}
      bind:value={inspector.id}
      aria-invalid={!!inspector.idIssue}
      aria-describedby={inspector.idIssue ? `${uid}-issue` : undefined}
      onblur={() => inspector.rename()}
      onkeydown={event => event.key === 'Enter' && event.currentTarget.blur()}
    />
  </label>
  {#if inspector.idIssue}
    <p id="{uid}-issue" class="mt-1 text-xs text-destructive">
      {nodeIdIssueText(inspector.idIssue)}
    </p>
    {#if inspector.suggestedId}
      {@const suggestion = inspector.suggestedId}
      <!-- A long id is cut: the whole id is in its tooltip and in the name of the button. -->
      <div class="mt-1.5 flex min-w-0 items-center gap-2 rounded-md border bg-muted/50 py-1 pr-1 pl-2">
        <span class="shrink-0 text-[11px] text-muted-foreground">
          {t(blueprintMessages.suggestedId)}
        </span>
        <code class="min-w-0 flex-1 truncate font-mono text-xs" title={suggestion}>{suggestion}</code>
        <!-- The pointer must not blur the field first: the blur applies the id and rebuilds the panel. -->
        <Button
          variant="outline"
          size="xs"
          class="shrink-0 bg-card"
          aria-label={t(blueprintMessages.useId(suggestion))}
          onpointerdown={event => event.preventDefault()}
          onclick={() => useSuggestion(suggestion)}
        >
          {t(blueprintMessages.use)}
        </Button>
      </div>
    {/if}
  {/if}
</div>
