<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { navigateTo } from '@scylla/core-sdk';
  import type { LoginZoneContext } from '@scylla/base-sdk';
  import { signUpLinkMessages } from '../sign-up-link.messages.ts';

  let { context }: { context: LoginZoneContext } = $props();
</script>

<Button variant="link" disabled={context.isPending} onclick={() => navigateTo('/register')}>
  {t(signUpLinkMessages.cta)}
</Button>
