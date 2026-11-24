<script lang="ts">
  import { ErrorState } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { layoutMessages } from '../../layout/messages/layout.messages.ts';
</script>

<div class="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
  <ErrorState title={t(layoutMessages.notFound)} message={t(layoutMessages.notFoundBody)} />
  <Button variant="outline" href="/">{t(layoutMessages.openScylla)}</Button>
</div>
