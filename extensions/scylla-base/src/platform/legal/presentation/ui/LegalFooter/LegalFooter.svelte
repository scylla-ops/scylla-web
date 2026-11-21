<script lang="ts">
  import { consentFrame, consentMessages, cookieSettings } from '@platform/consent';
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { legalQueries } from '../../legal.queries.ts';
  import { legalMessages as messages } from '../../messages/legal.messages.ts';
  import {
    FOOTER_KINDS,
    legalLinks,
    type LegalLink,
  } from '../../presenters/legal-links.presenter.ts';

  interface Props {
    /** The kinds of the links, in their order. */
    kinds?: readonly LegalLink['kind'][];
    class?: string;
  }

  let { kinds = FOOTER_KINDS, class: className }: Props = $props();

  const info = createQuery(() => legalQueries.info());

  const links = $derived(legalLinks(info.data, kinds, true));
  const operator = $derived(info.data?.operator.name ?? '');
  const year = new Date().getFullYear();
  // The entry of the cookie settings: only while one tracker needs consent.
  const consent = consentFrame().on;
</script>

<!-- The links that the operator turned on, and its name. Nothing while it set none. -->
{#if links.length > 0 || operator || consent}
  <footer
    class={cn('flex flex-col items-center gap-1 text-center text-xs text-muted-foreground', className)}
  >
    {#if links.length > 0 || consent}
      <nav aria-label={t(messages.footerLabel)}>
        <ul class="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          {#each links as link, index (link.kind)}
            <li class="flex items-center gap-1.5">
              {#if index > 0}<span aria-hidden="true">·</span>{/if}
              <a
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                class="underline-offset-4 hover:text-foreground hover:underline"
              >
                {link.label}
              </a>
            </li>
          {/each}
          {#if consent}
            <li class="flex items-center gap-1.5">
              {#if links.length > 0}<span aria-hidden="true">·</span>{/if}
              <button
                type="button"
                class="cursor-pointer underline-offset-4 hover:text-foreground hover:underline"
                onclick={() => cookieSettings.open('preferences')}
              >
                {t(consentMessages.cookieSettings)}
              </button>
            </li>
          {/if}
        </ul>
      </nav>
    {/if}
    {#if operator}
      <p>{t(messages.copyright(year, operator))}</p>
    {/if}
  </footer>
{/if}
