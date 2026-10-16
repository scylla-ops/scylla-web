<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import XIcon from '@lucide/svelte/icons/x';
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
  } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import type { EnvRow, StepNodeForm } from '../step-node-form.state.svelte.ts';
  import { pipelineMessages } from '../../../../pipeline.messages.ts';

  interface Props {
    form: StepNodeForm;
    /** Scopes the secret picker. */
    projectId?: string;
  }

  let { form, projectId }: Props = $props();

  // Same options object as the `secret` module: one cache entry.
  const secretsQuery = createQuery(() => secretQueries.byProject(projectId ?? ''));
  const secrets = $derived(secretsQuery.data ?? []);
</script>

<section class="flex flex-col gap-2 px-5 py-4">
  <h3 class="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
    {t(pipelineMessages.environmentVariables)}
  </h3>
  {#each form.envRows as row, index (index)}
    <div class="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)_auto] items-center gap-1.5">
      <Input
        value={row.key}
        oninput={event => form.setEnv(index, { key: event.currentTarget.value })}
        placeholder={t(pipelineMessages.envKeyPlaceholder)}
        aria-label={t(pipelineMessages.envKeyPlaceholder)}
        class="font-mono text-xs"
      />
      <Select
        type="single"
        value={row.kind}
        onValueChange={value => form.setEnv(index, { kind: value as EnvRow['kind'] })}
      >
        <SelectTrigger aria-label={t(pipelineMessages.envKindLabel)} class="w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="literal" label={t(pipelineMessages.envKindLiteral)}>
            {t(pipelineMessages.envKindLiteral)}
          </SelectItem>
          <SelectItem value="secret" label={t(pipelineMessages.envKindSecret)}>
            {t(pipelineMessages.envKindSecret)}
          </SelectItem>
        </SelectContent>
      </Select>

      {#if row.kind === 'secret' && (secrets.length > 0 || row.secretRef)}
        <Select
          type="single"
          value={row.secretRef}
          onValueChange={value => form.setEnv(index, { secretRef: value })}
        >
          <SelectTrigger aria-label={t(pipelineMessages.referenceASecret)} class="w-full text-xs">
            <SelectValue placeholder={t(pipelineMessages.referenceASecret)} />
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
      {:else if row.kind === 'secret'}
        <!-- A free-text box when there is nothing to pick: writing a reference must still work. -->
        <Input
          value={row.secretRef}
          oninput={event => form.setEnv(index, { secretRef: event.currentTarget.value })}
          placeholder={t(pipelineMessages.secretNamePlaceholder)}
          aria-label={t(pipelineMessages.referenceASecret)}
          class="font-mono text-xs"
        />
      {:else}
        <Input
          value={row.value}
          oninput={event => form.setEnv(index, { value: event.currentTarget.value })}
          placeholder={t(pipelineMessages.envValuePlaceholder)}
          aria-label={t(pipelineMessages.envValuePlaceholder)}
          class="font-mono text-xs"
        />
      {/if}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t(pipelineMessages.removeVariable)}
        onclick={() => form.removeEnv(index)}
      >
        <XIcon class="size-4" />
      </Button>
    </div>
  {/each}
  <Button type="button" variant="outline" size="sm" class="self-start border-dashed" onclick={form.addEnv}>
    <PlusIcon class="size-4" />
    {t(pipelineMessages.addVariable)}
  </Button>
</section>
