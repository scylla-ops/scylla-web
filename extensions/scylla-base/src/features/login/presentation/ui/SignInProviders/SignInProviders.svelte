<script lang="ts">
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { SignInProvider } from '@base/features/login/domain/structs/sign-in-methods.struct.ts';
  import { providerStartUrl } from '@base/features/login/presentation/mappers/provider-start.mapper.ts';
  import { signUpMessages } from '@base/features/login/presentation/messages/sign-up.messages.ts';

  interface Props {
    providers: readonly SignInProvider[];
    /** The page of this app after the sign-in. */
    returnPath: string;
  }

  let { providers, returnPath }: Props = $props();

  const apiUrl: string = import.meta.env.VITE_API_URL ?? '';
</script>

<!-- One link per identity provider of the server: a full page load to the provider. -->
{#if providers.length > 0}
  <div class="mt-6 flex flex-col gap-2">
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
      >
        {t(signUpMessages.continueWith(provider.displayName))}
      </Button>
    {/each}
  </div>
{/if}
