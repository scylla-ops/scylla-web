<script lang="ts">
  import { FieldMessage } from '@scylla/ui';
  import { Permission, can } from '@platform/authz';
  import { createQuery } from '@scylla/core-sdk';
  import { secretQueries } from '@base/features/secret';
  import { SearchSelect } from '@scylla/ui';
  import { Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { FragmentParameter } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import ParameterKey from '@base/features/pipeline/presentation/ui/library/ParameterKey.svelte';

  interface Props {
    parameter: FragmentParameter;
    value: string;
    projectId?: string;
    onChange: (value: string) => void;
  }

  let { parameter, value, projectId, onChange }: Props = $props();

  // The options of the `secret` module, as the environment fields of a node read them.
  const secretsQuery = createQuery(() => ({
    ...secretQueries.byProject(projectId ?? ''),
    enabled: parameter.kind === 'secret' && !!projectId && can(Permission.LIST_SECRETS, { projectId }),
  }));
  const choices = $derived([
    ...(value && !secretsQuery.data?.some(secret => secret.name === value) ? [{ value, label: value }] : []),
    ...(secretsQuery.data ?? []).map(secret => ({ value: secret.name, label: secret.name })),
  ]);

  const missing = $derived(parameter.kind === 'secret' && !value.trim());
  const id = $derived(`block-parameter-${parameter.key}`);
</script>

<!-- One parameter of a block: a value, or the name of a secret of the project. -->
<div class="flex flex-col gap-1.5">
  <label for={id}><ParameterKey {parameter} required={parameter.kind === 'secret'} /></label>
  {#if parameter.kind === 'secret'}
    <SearchSelect
      {id}
      options={choices}
      {value}
      onValueChange={onChange}
      placeholder={t(libraryMessages.chooseSecret)}
      aria-label={parameter.key}
      class={missing ? 'border-destructive' : undefined}
    />
    <FieldMessage message={missing && t(libraryMessages.secretMissing)} />
  {:else}
    <Input {id} {value} class="font-mono" oninput={event => onChange(event.currentTarget.value)} />
    {#if parameter.description}
      <p class="text-xs text-muted-foreground">{parameter.description}</p>
    {/if}
  {/if}
</div>
