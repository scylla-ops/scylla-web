<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { layoutMessages } from '../../layout/messages/layout.messages.ts';
</script>

<div class="flex h-full min-h-64 flex-col items-center justify-center gap-4 p-4 text-center">
  <div class="space-y-2">
    <h2 class="text-lg">{t(layoutMessages.notFound)}</h2>
    <p class="text-sm text-muted-foreground">{t(layoutMessages.notFoundBody)}</p>
  </div>
  <Button variant="outline" href="/">{t(layoutMessages.openScylla)}</Button>
</div>
