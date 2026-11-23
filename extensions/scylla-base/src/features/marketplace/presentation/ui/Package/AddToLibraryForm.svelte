<script lang="ts">
  import GitForkIcon from '@lucide/svelte/icons/git-fork';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import LinkIcon from '@lucide/svelte/icons/link';
  import {
    Button,
    Input,
    Label,
    RadioGroup,
    RadioGroupItem,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { nodeIdIssueText } from '@base/features/pipeline';
  import type { MarketPackage } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import { createAddToLibrary, type AddToLibraryForm } from './add-to-library.state.svelte.ts';
  import type { AddMode } from './package-page.state.svelte.ts';

  interface Props {
    pkg: MarketPackage;
    /** The choice that the dialog opens on. */
    mode: AddMode;
    workspace: string;
    /** The names of the library: a new fragment takes another one. */
    takenNames: readonly string[];
    pending: boolean;
    onCancel: () => void;
    onAdd: (form: AddToLibraryForm) => void;
  }

  let { pkg, mode, workspace, takenNames, pending, onCancel, onAdd }: Props = $props();

  // The dialog builds the form again at each opening: the props of the opening are its start.
  // svelte-ignore state_referenced_locally
  const form = createAddToLibrary(pkg, mode, takenNames);

  const MODES = $derived([
    {
      value: 'linked' as const,
      icon: LinkIcon,
      title: t(marketplaceMessages.linked),
      hint: t(marketplaceMessages.linkedHint(workspace, pkg.publisher.handle)),
      recommended: true,
    },
    {
      value: 'forked' as const,
      icon: GitForkIcon,
      title: t(marketplaceMessages.fork),
      hint: t(marketplaceMessages.forkHint(workspace)),
      recommended: false,
    },
  ]);

  const versionLabel = (number: number) =>
    number === form.choices[0]?.number
      ? t(marketplaceMessages.latestVersion(number))
      : t(marketplaceMessages.versionOption(number));
</script>

<div class="flex flex-col gap-4">
  <fieldset class="flex flex-col gap-2">
    <legend class="mb-2 text-sm font-medium">{t(marketplaceMessages.howToUse(workspace))}</legend>
    <RadioGroup value={form.mode} onValueChange={value => (form.mode = value as AddMode)} class="gap-2">
      {#each MODES as option (option.value)}
        <Label
          class={cn(
            'flex cursor-pointer items-center gap-3 rounded-xl border p-3 font-normal',
            form.mode === option.value && 'border-primary bg-primary/5',
          )}
        >
          <RadioGroupItem value={option.value} />
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-info/12 text-info">
            <option.icon class="size-4" />
          </span>
          <span class="flex flex-col gap-1">
            <span class="flex items-center gap-2 text-sm font-medium">
              {option.title}
              {#if option.recommended}
                <span class="rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">
                  {t(marketplaceMessages.recommended)}
                </span>
              {/if}
            </span>
            <span class="text-xs text-muted-foreground">{option.hint}</span>
          </span>
        </Label>
      {/each}
    </RadioGroup>
  </fieldset>

  <div class="grid gap-3 sm:grid-cols-2">
    <div class="flex flex-col gap-1.5">
      <Label>{t(marketplaceMessages.version)}</Label>
      <Select
        type="single"
        value={String(form.version)}
        onValueChange={value => (form.version = Number(value))}
      >
        <SelectTrigger aria-label={t(marketplaceMessages.version)}>{versionLabel(form.version)}</SelectTrigger>
        <SelectContent>
          {#each form.choices as choice (choice.number)}
            <SelectItem value={String(choice.number)} label={versionLabel(choice.number)}>
              {versionLabel(choice.number)}
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>
      <p class="text-xs text-muted-foreground">{t(marketplaceMessages.olderVersionsStay)}</p>
    </div>
    <div class="flex flex-col gap-1.5">
      <Label for="library-name">{t(marketplaceMessages.nameInLibrary)}</Label>
      <Input
        id="library-name"
        value={form.name}
        oninput={event => (form.name = event.currentTarget.value)}
        aria-invalid={form.nameTaken || !!form.nameIssue}
      />
      <p
        class={cn(
          'text-xs',
          form.nameTaken || form.nameIssue ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {#if form.nameIssue}
          {nodeIdIssueText(form.nameIssue)}
        {:else if form.nameTaken}
          {t(marketplaceMessages.nameTaken(form.name.trim()))}
        {:else}
          {t(marketplaceMessages.shownAs(form.name.trim(), pkg.publisher.handle))}
        {/if}
      </p>
    </div>
  </div>

  {#if form.secrets.length}
    <div class="flex gap-2.5 rounded-xl bg-muted p-3 text-sm">
      <KeyRoundIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div class="flex flex-col gap-0.5">
        <p class="font-medium">
          {t(marketplaceMessages.needsSecrets(form.secrets.length, form.secrets.join(', ')))}
        </p>
        <p class="text-xs text-muted-foreground">{t(marketplaceMessages.secretsNotice(workspace))}</p>
      </div>
    </div>
  {/if}

  <div class="flex justify-end gap-2">
    <Button variant="outline" onclick={onCancel}>{t(marketplaceMessages.cancel)}</Button>
    <Button disabled={!form.ready || pending} onclick={() => onAdd(form)}>
      {t(marketplaceMessages.addVersion(form.version))}
    </Button>
  </div>
</div>
