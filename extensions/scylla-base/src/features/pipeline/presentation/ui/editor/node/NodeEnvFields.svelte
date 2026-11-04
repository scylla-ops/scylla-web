<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { createQuery } from '@scylla/core-sdk';
  import { secretQueries } from '@base/features/secret';
  import {
    Button,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { EnvRow } from '@base/features/pipeline/presentation/mappers/env-row.mapper.ts';
  import type { NodeDraft } from './node-draft.state.svelte.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';

  interface Props {
    draft: NodeDraft;
    /** Scopes the secret picker. */
    projectId?: string;
  }

  let { draft, projectId }: Props = $props();

  // Same options object as the `secret` module: one cache entry.
  const secretsQuery = createQuery(() => secretQueries.byProject(projectId ?? ''));
  const secrets = $derived(secretsQuery.data ?? []);

  // Below the container's `sm` width the value control moves to its own line.
  const valueClass = 'min-w-0 order-last basis-full @sm:order-none @sm:flex-1';
</script>

<div class="@container flex flex-col gap-2 p-4">
  {#each draft.envRows as row, index (index)}
    <div class="flex flex-wrap items-center gap-2">
      <Input
        value={row.key}
        oninput={event => draft.setEnv(index, { key: event.currentTarget.value })}
        placeholder={t(nodeMessages.envKeyPlaceholder)}
        aria-label={t(nodeMessages.envKeyPlaceholder)}
        class="flex-1 font-mono"
      />
      <Select
        type="single"
        value={row.kind}
        onValueChange={value => draft.setEnv(index, { kind: value as EnvRow['kind'] })}
      >
        <SelectTrigger aria-label={t(nodeMessages.envKindLabel)} class="w-26 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="literal" label={t(nodeMessages.envKindLiteral)}>
            {t(nodeMessages.envKindLiteral)}
          </SelectItem>
          <SelectItem value="secret" label={t(nodeMessages.envKindSecret)}>
            {t(nodeMessages.envKindSecret)}
          </SelectItem>
        </SelectContent>
      </Select>

      {#if row.kind === 'secret'}
        <!-- A free-text box when there is nothing to pick: writing a reference must still work. -->
        {#if secrets.length > 0 || row.secretRef}
          <Select
            type="single"
            value={row.secretRef}
            onValueChange={value => draft.setEnv(index, { secretRef: value })}
          >
            <SelectTrigger aria-label={t(nodeMessages.referenceASecret)} class={valueClass}>
              <SelectValue placeholder={t(nodeMessages.referenceASecret)} />
            </SelectTrigger>
            <SelectContent>
              {#if row.secretRef && !secrets.some(secret => secret.name === row.secretRef)}
                <SelectItem value={row.secretRef} label={row.secretRef}>{row.secretRef}</SelectItem>
              {/if}
              {#each secrets as secret (secret.id)}
                <SelectItem value={secret.name} label={secret.name}>{secret.name}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        {:else}
          <Input
            value={row.secretRef}
            oninput={event => draft.setEnv(index, { secretRef: event.currentTarget.value })}
            placeholder={t(nodeMessages.secretNamePlaceholder)}
            aria-label={t(nodeMessages.referenceASecret)}
            class={valueClass}
          />
        {/if}
      {:else}
        <Input
          value={row.value}
          oninput={event => draft.setEnv(index, { value: event.currentTarget.value })}
          placeholder={t(nodeMessages.envValuePlaceholder)}
          aria-label={t(nodeMessages.envValuePlaceholder)}
          class="{valueClass} font-mono"
        />
      {/if}

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(nodeMessages.removeVariable)}
        onclick={() => draft.removeEnv(index)}
      >
        <Trash2Icon class="size-4" />
      </Button>
    </div>
  {/each}
  <Button variant="outline" size="sm" class="self-start" onclick={() => draft.addEnv()}>
    <PlusIcon class="size-4" />
    {t(nodeMessages.addVariable)}
  </Button>
</div>
