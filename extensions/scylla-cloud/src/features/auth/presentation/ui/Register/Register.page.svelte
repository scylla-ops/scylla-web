<script lang="ts">
  import LogoScylla from '@scylla/ui/assets/logo_scylla.png';
  import LogoScyllaDark from '@scylla/ui/assets/logo_scylla_dark.png';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/shadcn';
  import { Button } from '@scylla/ui/shadcn';
  import { ScyllaLoadingScreen } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { navigateTo } from '@scylla/core-sdk';
  import { RegisterPageState } from '../../register-page.state.svelte.ts';
  import RegisterForm from '../RegisterForm/RegisterForm.svelte';
  import { registerMessages } from '../register.messages.ts';

  // Built during initialisation: its mutation needs an owner.
  const state = new RegisterPageState();
</script>

{#if state.isSuccess}
  <ScyllaLoadingScreen />
{:else}
  <div class="flex flex-col items-center">
    <!-- A dark variant swapped by CSS: `.dark` is set before the first paint, so no flash. -->
    <img src={LogoScylla} alt="Scylla" class="h-2/6 w-2/6 dark:hidden" />
    <img src={LogoScyllaDark} alt="Scylla" class="hidden h-2/6 w-2/6 dark:block" />

    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t(registerMessages.title)}</CardTitle>
        <CardDescription>{t(registerMessages.description)}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm handleSubmit={state.submit} isPending={state.isPending} />
      </CardContent>
    </Card>

    <Button variant="link" onclick={() => navigateTo('/login')}>
      {t(registerMessages.backToLogin)}
    </Button>
  </div>
{/if}
