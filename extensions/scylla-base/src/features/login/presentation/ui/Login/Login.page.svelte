<script lang="ts">
  import LogoScylla from '@scylla/ui/assets/logo_scylla.svg';
  import LogoScyllaDark from '@scylla/ui/assets/logo_scylla_dark.svg';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/shadcn';
  import { ScyllaLoadingScreen } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { LoginState } from '@base/features/login';
  import { loginPoints } from '../../login.points.ts';
  import LoginForm from '../LoginForm/LoginForm.svelte';
  import { loginMessages } from '../login.messages.ts';

  // Built during initialisation: its mutation needs an owner.
  const state = new LoginState();
</script>

{#if state.isSuccess}
  <ScyllaLoadingScreen />
{:else}
  <div class="flex min-h-svh flex-col items-center justify-center p-6">
    <!-- A dark variant swapped by CSS: `.dark` is set before the first paint, so no flash. -->
    <img src={LogoScylla} alt="Scylla" class="mb-8 w-56 dark:hidden" />
    <img src={LogoScyllaDark} alt="Scylla" class="mb-8 hidden w-56 dark:block" />

    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t(loginMessages.title)}</CardTitle>
        <CardDescription>{t(loginMessages.description)}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm handleSubmit={state.submit} isPending={state.isPending} />
      </CardContent>
    </Card>

    <!-- No default content: a zone that only ever receives `after` components (e.g. a sign-up link). -->
    <div use:loginPoints.footer={{ isPending: state.isPending }}></div>
  </div>
{/if}
