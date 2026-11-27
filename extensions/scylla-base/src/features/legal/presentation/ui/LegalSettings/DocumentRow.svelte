<script lang="ts">
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import { StableLabel } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    Switch,
  } from '@scylla/ui/primitives';
  import {
    ACCEPTANCE_KINDS,
    legalKindTitles,
    type LegalDocument,
    type LegalDocumentChange,
    type LegalDocumentKind,
  } from '@platform/legal';
  import {
    sameAsServer,
    toChange,
    toDraft,
    urlIsValid,
    type DocumentDraft,
    type DocumentMode,
  } from '@base/features/legal/presentation/mappers/document-draft.mapper.ts';
  import { legalSettingsMessages as messages } from '@base/features/legal/presentation/messages/legal-settings.messages.ts';
  import { parseMarkdown } from '@base/features/legal/presentation/presenters/markdown.presenter.ts';
  import MarkdownView from '../MarkdownView/MarkdownView.svelte';
  import TextArea from './TextArea.svelte';

  interface Props {
    kind: LegalDocumentKind;
    /** The document of the server, or `undefined` when the kind is off. */
    document: LegalDocument | undefined;
    disabled: boolean;
    /** Calls `saved` when the server holds the change. */
    onSave: (change: LegalDocumentChange, saved: () => void) => void;
  }

  let { kind, document, disabled, onSave }: Props = $props();

  const MODES: readonly { mode: DocumentMode; label: () => string }[] = [
    { mode: 'off', label: () => t(messages.off) },
    { mode: 'url', label: () => t(messages.link) },
    { mode: 'markdown', label: () => t(messages.markdown) },
  ];

  /** What the user changed. `null`: the document of the server. */
  let typed = $state<DocumentDraft | null>(null);
  let previewing = $state(false);

  const draft = $derived(typed ?? toDraft(document));
  const changed = $derived(typed !== null && !sameAsServer(typed, document));
  const valid = $derived(urlIsValid(draft));
  const kindTitle = $derived(t(legalKindTitles[kind]));
  const summary = $derived.by(() => {
    if (!document) return t(messages.stateOff);
    if (document.content.type === 'url') return t(messages.stateLink(document.content.url));
    return t(messages.stateMarkdown);
  });
  const saveLabel = $derived(
    draft.mode !== 'off' && draft.version.trim()
      ? t(messages.publish(draft.version.trim()))
      : t(messages.save),
  );

  const set = <K extends keyof DocumentDraft>(field: K, value: DocumentDraft[K]) => {
    typed = { ...draft, [field]: value };
  };

  const id = $props.id();
</script>

<li class="flex flex-col gap-4 rounded-xl border border-border p-4">
  <div class="flex flex-wrap items-center gap-3">
    <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
      <FileTextIcon class="size-4 text-muted-foreground" />
    </span>
    <div class="flex min-w-0 grow basis-48 flex-col">
      <p class="text-sm font-medium">{kindTitle}</p>
      <p class="truncate text-xs text-muted-foreground">{summary}</p>
    </div>
    <Select
      type="single"
      value={draft.mode}
      {disabled}
      onValueChange={value => set('mode', value as DocumentMode)}
    >
      <SelectTrigger size="sm" class="w-32" aria-label={t(messages.mode(kindTitle))}>
        {MODES.find(option => option.mode === draft.mode)?.label()}
      </SelectTrigger>
      <SelectContent>
        {#each MODES as option (option.mode)}
          <SelectItem value={option.mode} label={option.label()}>{option.label()}</SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  {#if draft.mode !== 'off'}
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="flex flex-col gap-2 sm:col-span-2">
        <Label for={`${id}-title`}>{t(messages.documentTitle)}</Label>
        <Input
          id={`${id}-title`}
          value={draft.title}
          maxlength={100}
          placeholder={kindTitle}
          aria-describedby={`${id}-title-hint`}
          {disabled}
          oninput={event => set('title', event.currentTarget.value)}
        />
        <p id={`${id}-title-hint`} class="text-xs text-muted-foreground">
          {t(messages.titleHint(kindTitle))}
        </p>
      </div>

      {#if draft.mode === 'url'}
        <div class="flex flex-col gap-2 sm:col-span-2">
          <Label for={`${id}-url`}>{t(messages.url)}</Label>
          <Input
            id={`${id}-url`}
            type="url"
            value={draft.url}
            maxlength={2048}
            placeholder="https://"
            aria-invalid={!valid && draft.url.trim() !== '' ? true : undefined}
            aria-describedby={`${id}-url-error`}
            {disabled}
            oninput={event => set('url', event.currentTarget.value)}
          />
          {#if !valid && draft.url.trim() !== ''}
            <p id={`${id}-url-error`} class="text-xs text-destructive">{t(messages.urlInvalid)}</p>
          {/if}
        </div>
      {:else}
        <div class="flex flex-col gap-2 sm:col-span-2">
          <div class="flex items-center justify-between gap-2">
            <Label for={`${id}-text`}>{t(messages.text)}</Label>
            <Button variant="ghost" size="sm" onclick={() => (previewing = !previewing)}>
              <StableLabel
                text={previewing ? t(messages.edit) : t(messages.preview)}
                reserve={[t(messages.edit), t(messages.preview)]}
              />
            </Button>
          </div>
          <!--
            The preview takes the box of the text, which stays below it: the parts under it do not
            move when the user switches.
          -->
          <div class="relative">
            <TextArea
              id={`${id}-text`}
              rows={10}
              class={cn('block font-mono text-xs md:text-xs', previewing && 'invisible')}
              value={draft.markdown}
              {disabled}
              oninput={event => set('markdown', event.currentTarget.value)}
            />
            {#if previewing}
              <div
                data-part="document-preview"
                class="absolute inset-0 overflow-y-auto rounded-lg border border-border p-4"
              >
                <MarkdownView blocks={parseMarkdown(draft.markdown)} />
              </div>
            {/if}
          </div>
          {#if kind === 'cookies' || kind === 'legal-notice'}
            <p class="text-xs text-muted-foreground">
              {kind === 'cookies' ? t(messages.cookiesHint) : t(messages.noticeHint)}
            </p>
          {/if}
        </div>
      {/if}

      <div class="flex flex-col gap-2">
        <Label for={`${id}-version`}>{t(messages.version)}</Label>
        <Input
          id={`${id}-version`}
          value={draft.version}
          maxlength={32}
          placeholder="1.0"
          {disabled}
          oninput={event => set('version', event.currentTarget.value)}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for={`${id}-date`}>{t(messages.effectiveDate)}</Label>
        <Input
          id={`${id}-date`}
          type="date"
          value={draft.effectiveDate}
          {disabled}
          oninput={event => set('effectiveDate', event.currentTarget.value)}
        />
      </div>

      {#if ACCEPTANCE_KINDS.includes(kind)}
        <div class="flex flex-col gap-2 sm:col-span-2">
          <Label for={`${id}-changes`}>{t(messages.changes)}</Label>
          <TextArea
            id={`${id}-changes`}
            rows={3}
            value={draft.changes}
            maxlength={2000}
            aria-describedby={`${id}-changes-hint`}
            {disabled}
            oninput={event => set('changes', event.currentTarget.value)}
          />
          <p id={`${id}-changes-hint`} class="text-xs text-muted-foreground">
            {t(messages.changesHint)}
          </p>
        </div>
        <Label
          class="flex items-center justify-between gap-4 rounded-lg border border-border p-3 sm:col-span-2"
        >
          <span class="text-sm font-normal">{t(messages.acceptAgain)}</span>
          <Switch
            checked={draft.acceptanceRequired}
            {disabled}
            onCheckedChange={checked => set('acceptanceRequired', checked)}
          />
        </Label>
      {/if}
    </div>
  {/if}

  <!-- Always in its place, disabled until a change: the first change pushes nothing down. -->
  <div class="flex justify-end">
    <Button
      disabled={!changed || disabled || !valid || (draft.mode === 'url' && !draft.url.trim())}
      onclick={() => onSave(toChange(kind, draft), () => (typed = null))}
    >
      {saveLabel}
    </Button>
  </div>
</li>
