<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import {
    Button,
    Checkbox,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    MARKETPLACE_CATEGORIES,
    type FragmentEntity,
    type MarketplaceCategory,
    type PublishToMarketplaceInput,
  } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { PUBLICATION_LICENSES } from '@base/features/pipeline/domain/structs/fragment-publication.struct.ts';
  import type { PublicationCheck } from '@base/features/pipeline/domain/structs/publication-check.struct.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import {
    categoryName,
    publicationCheckText,
  } from '@base/features/pipeline/presentation/presenters/fragment-community.presenter.ts';
  import { createPublishForm } from './publish-form.state.svelte.ts';

  interface Props {
    fragment: FragmentEntity;
    scope: string;
    workspace: string;
    /** The version that the dialog opens on. */
    version: number;
    pending: boolean;
    onCancel: () => void;
    onPublish: (input: Omit<PublishToMarketplaceInput, 'author'>) => void;
  }

  let { fragment, scope, workspace, version, pending, onCancel, onPublish }: Props = $props();

  // The dialog builds the form again at each opening: the props of the opening are its start.
  // svelte-ignore state_referenced_locally
  const form = createPublishForm(fragment, scope, version);

  const passed = $derived(form.checks.filter(check => check.passed).length);

  const iconOf = (check: PublicationCheck) =>
    check.passed ? CircleCheckIcon : check.severity === 'error' ? CircleXIcon : TriangleAlertIcon;
  const toneOf = (check: PublicationCheck) =>
    check.passed ? 'text-primary' : check.severity === 'error' ? 'text-destructive' : 'text-warning';


</script>

<div class="flex flex-col gap-4">
  <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
    <div class="flex flex-col gap-1.5">
      <Label for="public-name">{t(communityMessages.publicName)}</Label>
      <Input id="public-name" value={form.name} readonly class="font-mono" />
      <p class="text-xs text-muted-foreground">{t(communityMessages.publicNameHint)}</p>
    </div>
    <div class="flex flex-col gap-1.5">
      <Label>{t(communityMessages.version)}</Label>
      <Select
        type="single"
        value={String(form.version)}
        onValueChange={value => (form.version = Number(value))}
      >
        <SelectTrigger aria-label={t(communityMessages.version)} class="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {#each form.choices as number (number)}
            <SelectItem value={String(number)} label={t(libraryMessages.version(number))}>
              {t(libraryMessages.version(number))}
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <div class="flex flex-col gap-1.5">
      <Label>{t(communityMessages.license)}</Label>
      <Select type="single" value={form.license} onValueChange={value => (form.license = value)}>
        <SelectTrigger aria-label={t(communityMessages.license)} class="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {#each PUBLICATION_LICENSES as license (license)}
            <SelectItem value={license} label={license}>{license}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>
    <div class="flex flex-col gap-1.5">
      <Label>{t(communityMessages.category)}</Label>
      <Select type="single" value={form.category} onValueChange={value => (form.category = value as MarketplaceCategory)}>
        <SelectTrigger aria-label={t(communityMessages.category)} class="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {#each MARKETPLACE_CATEGORIES as category (category)}
            <SelectItem value={category} label={t(categoryName(category))}>
              {t(categoryName(category))}
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>
  </div>

  {#if fragment.tags.length}
    <div class="flex flex-col gap-1.5">
      <Label>{t(communityMessages.tags)}</Label>
      <p class="flex flex-wrap gap-1.5">
        {#each fragment.tags as tag (tag)}
          <span class="rounded-full bg-muted px-2 py-0.5 text-xs">{tag}</span>
        {/each}
      </p>
    </div>
  {/if}

  <section class="flex flex-col gap-2 rounded-xl border p-3">
    <h3 class="flex items-center justify-between text-sm">
      {t(communityMessages.beforePublishing)}
      <span class="text-xs text-muted-foreground">
        {t(communityMessages.checksPassed(passed, form.checks.length))}
      </span>
    </h3>
    <ul class="flex flex-col gap-2">
      {#each form.checks as check (check.kind)}
        {@const Icon = iconOf(check)}
        {@const text = publicationCheckText(check, workspace, form.secrets)}
        <li class="flex gap-2 text-sm">
          <Icon class="mt-0.5 size-4 shrink-0 {toneOf(check)}" />
          <span class="flex flex-col">
            <span>{t(text.title)}</span>
            {#if text.detail}
              <span class="text-xs text-muted-foreground">{t(text.detail)}</span>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  </section>

  <label class="flex items-center gap-3">
    <Checkbox
      checked={form.autoPublish}
      onCheckedChange={checked => (form.autoPublish = checked === true)}
    />
    <span class="flex flex-col">
      <span class="text-sm">{t(communityMessages.autoPublish)}</span>
      <span class="text-xs text-muted-foreground">{t(communityMessages.autoPublishHint)}</span>
    </span>
  </label>

  <div class="flex justify-end gap-2">
    <Button variant="outline" onclick={onCancel}>{t(communityMessages.cancel)}</Button>
    <Button disabled={!form.ready || pending} onclick={() => onPublish(form.input())}>
      {t(communityMessages.publish(form.version))}
    </Button>
  </div>
</div>
