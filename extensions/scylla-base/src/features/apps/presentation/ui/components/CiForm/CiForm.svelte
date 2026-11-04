<script lang="ts">
  import {
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    ToggleGroup,
    ToggleGroupItem,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { CiProvider } from '@base/features/apps/domain/entities/ci-identity.entity.ts';
  import type { CiRefKind } from '@base/features/apps/domain/structs/ci-ref.struct.ts';
  import { credentialsMessages as messages } from '@base/features/apps/presentation/messages/credentials.messages.ts';

  interface Props {
    provider: CiProvider;
    repository: string;
    refKind: CiRefKind;
    refValue: string;
    /** The address of the server: the audience of the ID tokens. */
    server: string;
  }

  let {
    provider = $bindable(),
    repository = $bindable(),
    refKind = $bindable(),
    refValue = $bindable(),
    server,
  }: Props = $props();

  const KINDS: readonly CiRefKind[] = ['branch', 'environment', 'any'];
  const kindLabel = (kind: CiRefKind) =>
    t({ branch: messages.branch, environment: messages.environment, any: messages.anyRef }[kind]);

  const repo = $derived(repository.trim() || t(messages.repositoryPlaceholder));
</script>

<div class="flex flex-col gap-4">
  <ToggleGroup
    type="single"
    value={provider}
    onValueChange={next => {
      if (next) provider = next as CiProvider;
    }}
    class="grid w-full grid-cols-2 rounded-lg bg-muted p-1"
  >
    <ToggleGroupItem
      value="github"
      class="rounded-md text-sm text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground"
    >
      {t(messages.github)}
    </ToggleGroupItem>
    <ToggleGroupItem
      value="gitlab"
      class="rounded-md text-sm text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground"
    >
      {t(messages.gitlab)}
    </ToggleGroupItem>
  </ToggleGroup>

  <div class="flex flex-col gap-1.5">
    <Label for="ci-repository">{t(messages.repository)}</Label>
    <Input
      id="ci-repository"
      bind:value={repository}
      placeholder={t(messages.repositoryPlaceholder)}
      autocomplete="off"
    />
  </div>

  <div class="flex flex-col gap-1.5">
    <Label for="ci-ref">{t(messages.branchOrEnvironment)}</Label>
    <div class="flex gap-2">
      <Select type="single" value={refKind} onValueChange={value => (refKind = value as CiRefKind)}>
        <SelectTrigger class="w-40" aria-label={t(messages.branchOrEnvironment)}>
          {kindLabel(refKind)}
        </SelectTrigger>
        <SelectContent>
          {#each KINDS as kind (kind)}
            <SelectItem value={kind} label={kindLabel(kind)}>{kindLabel(kind)}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
      {#if refKind !== 'any'}
        <Input id="ci-ref" class="flex-1" bind:value={refValue} placeholder="main" autocomplete="off" />
      {/if}
    </div>
  </div>

  <div class="flex items-center justify-between gap-2 text-xs">
    <span class="text-muted-foreground">{t(messages.audience)}</span>
    <span class="font-mono">{server}</span>
  </div>
  <p class="text-xs text-muted-foreground">
    {refKind === 'any' || !refValue.trim()
      ? t(messages.ciAny(repo))
      : t(messages.ciOnly(repo, refValue.trim()))}
  </p>
</div>
