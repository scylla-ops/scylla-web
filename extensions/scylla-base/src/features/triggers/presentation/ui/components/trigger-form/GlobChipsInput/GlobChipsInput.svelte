<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    gitGlobIssue,
    type GitGlobIssue,
  } from '@base/features/triggers/domain/structs/git-glob.struct.ts';
  import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';

  interface Props {
    id: string;
    label: string;
    values: string[];
    placeholder: string;
    /** Under the field: what an empty list means. */
    hint?: string;
    disabled?: boolean;
    onChange: (values: string[]) => void;
  }

  let { id, label, values, placeholder, hint, disabled = false, onChange }: Props = $props();

  let text = $state('');
  let issue = $state<GitGlobIssue | null>(null);

  const ISSUE_TEXT = {
    blank: null,
    tooLong: triggersMessages.globTooLong,
    duplicate: triggersMessages.globDuplicate,
    tooMany: triggersMessages.globTooMany,
  } as const;
  const issueText = $derived(issue ? ISSUE_TEXT[issue] : null);

  /** Enter or a comma adds the text as a chip. A blank text adds nothing. */
  const commit = () => {
    const found = gitGlobIssue(text, values);
    issue = found === 'blank' ? null : found;
    if (found) return;
    onChange([...values, text.trim()]);
    text = '';
  };

  const remove = (glob: string) => onChange(values.filter(value => value !== glob));

  const onkeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && text === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };
</script>

<div class="flex flex-col gap-1.5">
  <Label for={id}>{label}</Label>
  <div
    class="flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-transparent px-1.5 py-0.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
  >
    {#each values as glob (glob)}
      <span
        class="inline-flex h-6 items-center justify-center gap-1 rounded-md bg-muted px-2 font-mono text-xs"
      >
        {glob}
        <button
          type="button"
          class="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          aria-label={t(triggersMessages.removeChip(glob))}
          {disabled}
          onclick={() => remove(glob)}
        >
          <XIcon class="size-3" />
        </button>
      </span>
    {/each}
    <input
      {id}
      class="h-6 min-w-32 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      value={text}
      {placeholder}
      {disabled}
      aria-invalid={issueText ? true : undefined}
      aria-describedby={issueText || hint ? `${id}-hint` : undefined}
      oninput={event => {
        text = event.currentTarget.value;
        issue = null;
      }}
      {onkeydown}
      onblur={commit}
    />
  </div>
  {#if issueText}
    <p id={`${id}-hint`} class="text-xs text-destructive">{t(issueText)}</p>
  {:else if hint}
    <p id={`${id}-hint`} class="text-xs text-muted-foreground">{hint}</p>
  {/if}
</div>
