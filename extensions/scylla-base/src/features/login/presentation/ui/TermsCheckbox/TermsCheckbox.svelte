<script lang="ts">
  import { Checkbox, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { LegalDocument } from '@platform/legal';
  import {
    linkSlot,
    type TermsLinks,
  } from '@base/features/login/presentation/presenters/linked-text.presenter.ts';
  import { termsMessages as m } from '@base/features/login/presentation/messages/terms.messages.ts';
  import LinkedText from '../LinkedText/LinkedText.svelte';

  interface Props {
    /** The terms to accept (`termsToAccept`). */
    terms: LegalDocument;
    links: TermsLinks;
    checked?: boolean;
    /** The refusal of the server, under the box. */
    error?: string;
    /** The label names the version, when the terms have one. */
    withVersion?: boolean;
    /** On the axis of a centered column. */
    centered?: boolean;
  }

  let {
    terms,
    links,
    checked = $bindable(false),
    error,
    withVersion = false,
    centered = false,
  }: Props = $props();

  const id = $props.id();
  const errorId = `${id}-error`;

  const sentence = $derived(
    withVersion && terms.version
      ? t(m.acceptVersion(linkSlot('terms'), terms.version))
      : t(m.accept(linkSlot('terms'))),
  );
</script>

<!-- The box is centered on its label; the refusal is under them. -->
<div class="flex flex-col gap-1.5">
  <Label class={cn('flex items-center gap-2 text-sm font-normal', centered && 'justify-center')}>
    <Checkbox
      bind:checked
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
    />
    <span><LinkedText {sentence} {links} /></span>
  </Label>
  {#if error}
    <p id={errorId} role="alert" class={cn('text-sm text-destructive', centered && 'text-center')}>
      {error}
    </p>
  {/if}
</div>
