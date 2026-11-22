<script lang="ts">
  import CookieIcon from '@lucide/svelte/icons/cookie';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { consentMessages as messages } from '../../messages/consent.messages.ts';
  import type { ConsentPurposeRow } from '../../presenters/consent.presenter.ts';
  import type { PolicyLink } from '../policy-link.ts';

  interface Props {
    rows: readonly ConsentPurposeRow[];
    /** The cookie policy of the operator, when it turned it on. */
    policy?: PolicyLink;
    /** A choice is on its way to the server: the buttons wait. */
    pending: boolean;
    onaccept: () => void;
    onreject: () => void;
    oncustomize: () => void;
  }

  let { rows, policy, pending, onaccept, onreject, oncustomize }: Props = $props();

  const id = $props.id();
  const purposes = $derived(rows.map(row => row.title).join(', '));
</script>

<!--
  A panel at the bottom that blocks nothing: the page stays usable. Three buttons of the same
  weight, so that a refusal is as easy as an acceptance.
-->
<div class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 print:hidden">
  <section
    aria-labelledby="{id}-title"
    aria-describedby="{id}-body"
    class="pointer-events-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-xl border border-border bg-popover p-5 text-center text-popover-foreground shadow-lg"
  >
    <div class="flex flex-col items-center gap-1.5">
      <h2 id="{id}-title" class="flex items-center justify-center gap-2 text-base">
        <CookieIcon class="size-4 shrink-0" aria-hidden="true" />
        {t(messages.bannerTitle)}
      </h2>
      <p id="{id}-body" class="text-sm text-muted-foreground">
        {t(messages.bannerBody)}
        {#if policy}
          <a
            href={policy.href}
            target={policy.external ? '_blank' : undefined}
            rel={policy.external ? 'noopener noreferrer' : undefined}
            class="text-foreground underline underline-offset-4 hover:text-primary"
          >
            {t(messages.cookiePolicy)}
          </a>
        {/if}
      </p>
      <p class="text-xs text-muted-foreground">{t(messages.bannerPurposes(purposes))}</p>
    </div>
    <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
      <Button variant="outline" disabled={pending} onclick={onreject}>
        {t(messages.rejectAll)}
      </Button>
      <Button variant="outline" disabled={pending} onclick={oncustomize}>
        {t(messages.customize)}
      </Button>
      <Button variant="outline" disabled={pending} onclick={onaccept}>
        {t(messages.acceptAll)}
      </Button>
    </div>
  </section>
</div>
