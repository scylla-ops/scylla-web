<script lang="ts">
  import scyllaLogo from '@scylla/ui/assets/logo_scylla.svg';
  import scyllaLogoDark from '@scylla/ui/assets/logo_scylla_dark.svg';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/shadcn';
  import { ScyllaForm, type FormValues } from '@scylla/ui';
  import { activeLocale, t } from '@scylla/ui/i18n';
  import { createOrganizationItems } from '@base/features/organization';
  import { layoutMessages } from './layout.messages.ts';
  import { welcomeIn } from './welcome-transition.ts';

  interface Props {
    isPending: boolean;
    onSubmit: (values: FormValues<'name' | 'description'>) => void;
  }

  let { isPending, onSubmit }: Props = $props();

  const items = $derived((activeLocale(), createOrganizationItems()));
</script>

<main in:welcomeIn class="flex h-full w-full flex-col p-2">
  <div class="flex h-full min-h-screen w-full flex-col items-center justify-center bg-background">
    <img src={scyllaLogo} alt="Scylla" class="mb-8 w-56 dark:hidden" />
    <img src={scyllaLogoDark} alt="Scylla" class="mb-8 hidden w-56 dark:block" />
    <Card class="w-full max-w-md">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">{t(layoutMessages.welcome)}</CardTitle>
        <CardDescription>{t(layoutMessages.getStarted)}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScyllaForm {items} {isPending} {onSubmit} buttonLabel={t(layoutMessages.create)} />
      </CardContent>
    </Card>
  </div>
</main>
