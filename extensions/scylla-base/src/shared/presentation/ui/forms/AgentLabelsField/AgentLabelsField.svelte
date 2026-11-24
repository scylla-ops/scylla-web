<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import type { Attachment } from 'svelte/attachments';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import XIcon from '@lucide/svelte/icons/x';
  import { Badge, Button, Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    agentLabelIssue,
    type AgentLabelIssue,
  } from '@shared/domain/structs/agent-label.struct.ts';
  import { agentLabelsMessages as messages } from '@shared/presentation/messages/agent-labels.messages.ts';

  interface Props {
    labels: readonly string[];
    onChange: (labels: string[]) => void;
    /** The name of the field of a new label, for a screen reader. */
    label?: string;
    disabled?: boolean;
    /**
     * Puts the caret in the field of a new label when the field shows, in a dialog or a popover:
     * else the focus goes to the remove button of the first label.
     */
    autofocus?: boolean;
  }

  let { labels, onChange, label, disabled = false, autofocus = false }: Props = $props();

  const focus: Attachment<HTMLInputElement> = element => element.focus();

  const ISSUES: Record<AgentLabelIssue, MessageDescriptor> = {
    format: messages.formatIssue,
    duplicate: messages.duplicateIssue,
    'too-many': messages.tooManyIssue,
  };

  let text = $state('');
  let issue = $state<AgentLabelIssue | null>(null);

  /** Adds the typed label, or tells why the list does not take it. */
  const add = () => {
    const typed = text.trim();
    if (!typed) return;
    issue = agentLabelIssue(typed, labels);
    if (issue) return;
    onChange([...labels, typed]);
    text = '';
  };

  const remove = (gone: string) => onChange(labels.filter(one => one !== gone));
</script>

<div class="flex flex-col gap-2">
  {#if labels.length}
    <ul class="flex flex-wrap items-center gap-1.5">
      {#each labels as one (one)}
        <li class="flex">
          <Badge variant="secondary" class="h-6 gap-1 pr-1 font-mono">
            <span class="[text-box:trim-both_cap_alphabetic]">{one}</span>
            <button
              type="button"
              class="inline-flex size-4 items-center justify-center rounded-full hover:bg-foreground/10 disabled:pointer-events-none"
              aria-label={t(messages.removeLabel(one))}
              {disabled}
              onclick={() => remove(one)}
            >
              <XIcon class="size-3" aria-hidden="true" />
            </button>
          </Badge>
        </li>
      {/each}
    </ul>
  {/if}
  <div class="flex items-center gap-2">
    <Input
      bind:value={text}
      class="font-mono"
      placeholder={t(messages.placeholder)}
      aria-label={label ?? t(messages.newLabel)}
      aria-invalid={issue ? true : undefined}
      autocomplete="off"
      spellcheck={false}
      {disabled}
      {@attach autofocus ? focus : undefined}
      oninput={() => (issue = null)}
      onkeydown={event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        add();
      }}
    />
    <Button
      type="button"
      variant="outline"
      class="shrink-0"
      disabled={disabled || !text.trim()}
      onclick={add}
    >
      <PlusIcon aria-hidden="true" />
      {t(messages.add)}
    </Button>
  </div>
  {#if issue}
    <p role="alert" class="text-xs text-destructive">{t(ISSUES[issue])}</p>
  {/if}
</div>
