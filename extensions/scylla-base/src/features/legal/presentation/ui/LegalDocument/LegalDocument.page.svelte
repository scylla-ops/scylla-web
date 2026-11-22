<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import FileXIcon from '@lucide/svelte/icons/file-x';
  import PrinterIcon from '@lucide/svelte/icons/printer';
  import LogoScylla from '@scylla/ui/assets/logo_scylla.svg';
  import LogoScyllaDark from '@scylla/ui/assets/logo_scylla_dark.svg';
  import { createQuery } from '@scylla/core-sdk';
  import { ErrorState, ListSkeleton } from '@scylla/ui';
  import { activeLocale, setAppLocale, t, type SupportedLocale } from '@scylla/ui/i18n';
  import {
    Button,
    buttonVariants,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { LegalFooter, legalQueries } from '@platform/legal';
  import { TrackerTable } from '@platform/trackers';
  import { legalDocumentMessages as messages } from '@base/features/legal/presentation/messages/legal-document.messages.ts';
  import {
    OPERATOR_SECTION,
    TRACKERS_SECTION,
    legalPage,
  } from '@base/features/legal/presentation/presenters/legal-page.presenter.ts';
  import MarkdownView from '../MarkdownView/MarkdownView.svelte';
  import { followSections } from './contents.attachments.ts';

  let { kind }: { kind?: string } = $props();

  const LOCALES: readonly { locale: SupportedLocale; label: string }[] = [
    { locale: 'en', label: 'English' },
    { locale: 'fr', label: 'Français' },
  ];

  const info = createQuery(() => legalQueries.info());
  const page = $derived(info.data ? legalPage(info.data, kind) : null);

  let active = $state<string | null>(null);

  // A document on another site: the page sends the browser there.
  $effect(() => {
    if (page?.state === 'elsewhere') window.location.replace(page.url);
  });
</script>

<!-- One frame for each legal document: public, with no session. Print shows the text only. -->
<div class="flex min-h-svh flex-col bg-background">
  <header class="border-b border-border print:hidden">
    <div class="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-6">
      <img src={LogoScylla} alt="Scylla" class="h-6 dark:hidden" />
      <img src={LogoScyllaDark} alt="Scylla" class="hidden h-6 dark:block" />
      <a
        href="/"
        class="flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeftIcon class="size-4" />
        <!-- A phone shows the arrow only: the header keeps one line. -->
        <span class="whitespace-nowrap max-sm:sr-only">{t(messages.backToScylla)}</span>
      </a>
      <div class="ml-auto flex items-center gap-2">
        <Select
          type="single"
          value={activeLocale()}
          onValueChange={value => void setAppLocale(value as SupportedLocale)}
        >
          <SelectTrigger size="sm" class="w-28" aria-label={t(messages.language)}>
            {LOCALES.find(option => option.locale === activeLocale())?.label}
          </SelectTrigger>
          <SelectContent>
            {#each LOCALES as option (option.locale)}
              <SelectItem value={option.locale} label={option.label}>{option.label}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onclick={() => window.print()}>
          <PrinterIcon />
          {t(messages.print)}
        </Button>
      </div>
    </div>
  </header>

  <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 print:py-0">
    {#if info.isError}
      <ErrorState message={info.error?.message} />
    {:else if !page}
      <ListSkeleton rows={6} rowClass="h-5 w-full rounded-md" />
    {:else if page.state === 'missing'}
      <div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <FileXIcon class="size-10 text-muted-foreground" />
        <h1>{t(messages.notFoundTitle)}</h1>
        <p class="text-sm text-muted-foreground">{t(messages.notFoundBody)}</p>
      </div>
    {:else if page.state === 'elsewhere'}
      <div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h1>{page.title}</h1>
        <p class="text-sm text-muted-foreground">{t(messages.elsewhereBody)}</p>
        <a href={page.url} rel="noopener noreferrer" class={buttonVariants({ variant: 'default' })}>
          <ExternalLinkIcon />
          {t(messages.open)}
        </a>
      </div>
    {:else}
      <div class="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label={t(messages.onThisPage)} class="hidden lg:block print:hidden">
          {#if page.contents.length > 0}
            <div class="sticky top-10 flex flex-col gap-3">
              <p class="text-xs font-medium text-muted-foreground">{t(messages.onThisPage)}</p>
              <ul class="flex flex-col border-l border-border">
                {#each page.contents as heading (heading.id)}
                  <li>
                    <a
                      href={`#${heading.id}`}
                      aria-current={active === heading.id ? 'location' : undefined}
                      class={[
                        '-ml-px flex items-center border-l-2 py-1 pl-3 text-sm',
                        active === heading.id
                          ? 'border-primary font-medium text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      ]}
                    >
                      {heading.text}
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </nav>

        {#key page.kind}
          <article class="flex max-w-3xl min-w-0 flex-col gap-6" {@attach followSections(id => (active = id))}>
            <div class="flex flex-col gap-2">
              <p class="text-xs font-medium tracking-wide text-primary uppercase">
                {t(messages.eyebrow(page.kindTitle))}
              </p>
              <h1>{page.title}</h1>
              {#if page.meta}
                <p class="text-sm text-muted-foreground">{page.meta}</p>
              {/if}
            </div>

            {#if page.operator.length > 0}
              <section class="flex flex-col gap-3">
                <h2 id={OPERATOR_SECTION} data-section class="scroll-mt-6 text-xl">
                  {t(messages.operator)}
                </h2>
                <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
                  {#each page.operator as line (line.label)}
                    <dt class="text-muted-foreground">{line.label}</dt>
                    <dd class="whitespace-pre-line">{line.value}</dd>
                  {/each}
                </dl>
              </section>
            {/if}

            <MarkdownView blocks={page.blocks} />

            {#if page.trackers}
              <section class="flex flex-col gap-3">
                <h2 id={TRACKERS_SECTION} data-section class="scroll-mt-6 text-xl">
                  {t(messages.trackers)}
                </h2>
                <TrackerTable />
              </section>
            {/if}

            {#if page.others.length > 0}
              <nav
                aria-label={t(messages.otherDocuments)}
                class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-6 text-sm print:hidden"
              >
                <span class="text-muted-foreground">{t(messages.otherDocumentsLead)}</span>
                {#each page.others as link (link.kind)}
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    class="text-primary underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                {/each}
              </nav>
            {/if}
          </article>
        {/key}
      </div>
    {/if}
  </main>

  <LegalFooter class="border-t border-border px-6 py-6 print:hidden" />
</div>
