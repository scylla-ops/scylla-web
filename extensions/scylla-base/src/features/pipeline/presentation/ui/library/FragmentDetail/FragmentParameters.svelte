<script lang="ts">
  import { Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { FragmentParameter } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import ParameterKey from '../ParameterKey.svelte';

  interface Props {
    parameters: FragmentParameter[];
  }

  let { parameters }: Props = $props();
</script>

<Card class="flex flex-col gap-4 p-4">
  <h2>{t(libraryMessages.parameters)}</h2>
  {#if parameters.length}
    <table class="w-full overflow-hidden rounded-lg text-xs outline outline-border">
      <thead class="bg-muted text-left text-muted-foreground">
        <tr>
          <th class="px-3 py-2 font-normal">{t(libraryMessages.parameterName)}</th>
          <th class="px-3 py-2 font-normal">{t(libraryMessages.parameterDefault)}</th>
          <th class="px-3 py-2 font-normal">{t(libraryMessages.parameterDescription)}</th>
        </tr>
      </thead>
      <tbody>
        {#each parameters as parameter (parameter.key)}
          <tr class="border-t">
            <td class="px-3 py-2.5"><ParameterKey {parameter} /></td>
            <td class="px-3 py-2.5 font-mono">
              {#if parameter.kind === 'secret'}
                <span class="rounded-full border px-2 py-0.5 font-sans font-medium">
                  {t(libraryMessages.secretRequired)}
                </span>
              {:else}
                {parameter.default}
              {/if}
            </td>
            <td class="px-3 py-2.5 text-muted-foreground">{parameter.description ?? ''}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="text-xs text-muted-foreground">{t(libraryMessages.noParameter)}</p>
  {/if}
</Card>
