<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { Skeleton, Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import BanIcon from '@lucide/svelte/icons/ban';
  import InfoIcon from '@lucide/svelte/icons/info';
  import LockIcon from '@lucide/svelte/icons/lock';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import AuthLayout from '../AuthLayout.svelte';
  import { loginQueries } from '@base/features/login/presentation/login.queries.ts';
  import { providerStartUrl } from '@base/features/login/presentation/mappers/provider-start.mapper.ts';
  import { signInErrorMessages } from '@base/features/login/presentation/messages/sign-in-error.messages.ts';
  import { signInErrorCard } from '@base/features/login/presentation/presenters/sign-in-error.presenter.ts';

  const ACCOUNT_PATH = '/account/security';

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('provider') ?? '';
  const link = params.get('link') === 'true';
  const apiUrl: string = import.meta.env.VITE_API_URL ?? '';

  // The list only gives the name of the provider, so its failure stays out of the page.
  const methods = createQuery(() => ({
    ...loginQueries.signInMethods(),
    retry: false,
    meta: { showsOwnError: true },
  }));

  // A name from the server, never the text of the URL.
  const provider = $derived(methods.data?.providers.find(item => item.slug === slug));
  const card = $derived(
    signInErrorCard(params.get('code'), provider?.displayName ?? t(signInErrorMessages.theProvider)),
  );
  const back = link ? ACCOUNT_PATH : '/login';
  const backLabel = link ? signInErrorMessages.backToAccount : signInErrorMessages.backToSignIn;
  const retry = $derived(
    provider &&
      providerStartUrl(
        apiUrl,
        provider.slug,
        window.location.origin,
        link ? ACCOUNT_PATH : '/',
        { link },
      ),
  );
  const icons = {
    info: InfoIcon,
    warning: TriangleAlertIcon,
    blocked: BanIcon,
    locked: LockIcon,
  };
  const Icon = $derived(icons[card.tone]);
</script>

{#if methods.isPending}
  <AuthLayout title={t(signInErrorMessages.failedTitle)}>
    <Skeleton class="h-16 w-full" />
  </AuthLayout>
{:else}
  <AuthLayout title={t(card.title)}>
    {#snippet icon()}
      <Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    {/snippet}
    <p role="alert" class="mb-4 text-sm text-muted-foreground">{t(card.body)}</p>
    <div class="flex flex-wrap items-center gap-2">
      {#if card.action === 'retry' && retry}
        <Button href={retry} rel="external" size="sm">{t(signInErrorMessages.tryAgain)}</Button>
      {/if}
      {#if card.action === 'start-again'}
        <Button href={back} size="sm">{t(signInErrorMessages.startAgain)}</Button>
      {:else}
        <Button href={back} size="sm" variant="outline">{t(backLabel)}</Button>
      {/if}
      <code class="ml-auto rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
        {card.code}
      </code>
    </div>
  </AuthLayout>
{/if}
