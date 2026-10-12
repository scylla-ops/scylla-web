<script lang="ts">
  import { Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { SecretLabelInput } from '@base/features/agents/presentation/secret-label-input.state.svelte.ts';
  import { secretLabelFieldMessages as messages } from './secret-label-field.messages.ts';

  interface Props {
    input: SecretLabelInput;
    label: string;
    /** Shown while the value has no problem. */
    help: string;
    disabled?: boolean;
    autofocus?: boolean;
  }

  let { input, label, help, disabled = false, autofocus = false }: Props = $props();

  const id = $props.id();
  const problem = $derived(input.problem);

  $effect(() => {
    if (input.refusals > 0) document.getElementById(`${id}-secret-label`)?.focus();
  });
</script>

<div class="flex flex-col gap-2">
  <Label for="{id}-secret-label" class="text-sm font-medium">{label}</Label>
  <Input
    id="{id}-secret-label"
    bind:value={input.value}
    autocomplete="off"
    spellcheck={false}
    {autofocus}
    {disabled}
    aria-invalid={problem !== null || undefined}
    aria-describedby="{id}-secret-label-help"
  />
  <p
    id="{id}-secret-label-help"
    class={cn('text-xs', problem ? 'text-destructive' : 'text-muted-foreground')}
  >
    {problem ? t(messages[problem]) : help}
  </p>
</div>
