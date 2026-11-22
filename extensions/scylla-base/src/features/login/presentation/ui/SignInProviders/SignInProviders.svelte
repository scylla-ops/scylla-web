<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { legalQueries } from '@platform/legal';
  import { ProviderMark } from '@shared/presentation/ui';
  import type { SignInProvider } from '@base/features/login/domain/structs/sign-in-methods.struct.ts';
  import { providerStartUrl } from '@base/features/login/presentation/mappers/provider-start.mapper.ts';
  import { signUpMessages } from '@base/features/login/presentation/messages/sign-up.messages.ts';
  import { termsMessages } from '@base/features/login/presentation/messages/terms.messages.ts';
  import {
    linkSlot,
    termsLinks,
  } from '@base/features/login/presentation/presenters/linked-text.presenter.ts';
  import LinkedText from '../LinkedText/LinkedText.svelte';

  interface Props {
    providers: readonly SignInProvider[];
    /** The page of this app after the sign-in. */
    returnPath: string;
  }

  let { providers, returnPath }: Props = $props();

  const apiUrl: string = import.meta.env.VITE_API_URL ?? '';

  const legal = createQuery(() => legalQueries.info());
  const links = $derived(termsLinks(legal.data));

  /** A first sign-in with a provider makes an account: the notice of the terms to accept. */
  const notice = $derived.by(() => {
    if (!links.terms) return '';
    return links.privacy
      ? t(termsMessages.providersNotice(linkSlot('terms'), linkSlot('privacy')))
      : t(termsMessages.providersNoticeNoPrivacy(linkSlot('terms')));
  });
</script>

<!-- One link per identity provider of the server: a full page load to the provider. -->
{#if providers.length > 0}
  <div class="mt-2 flex flex-col gap-2">
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <span class="h-px flex-1 bg-border"></span>
      {t(signUpMessages.orContinueWith)}
      <span class="h-px flex-1 bg-border"></span>
    </div>
    {#each providers as provider (provider.slug)}
      <Button
        variant="outline"
        class="w-full"
        href={providerStartUrl(apiUrl, provider.slug, window.location.origin, returnPath)}
        rel="external"
      >
        <ProviderMark kind={provider.kind} />
        {t(signUpMessages.continueWith(provider.displayName))}
      </Button>
    {/each}
    {#if notice}
      <p class="mt-1 text-center text-xs text-muted-foreground">
        <LinkedText sentence={notice} {links} />
      </p>
    {/if}
  </div>
{/if}
