<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, Switch } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { apiAccessMessages as messages } from '@shared/presentation/messages/api-access.messages.ts';

  interface Props {
    title: string;
    description: string;
    enabled: boolean;
    disabled?: boolean;
    /** The switch shows `enabled` until the owner of the card changes it: a confirmation can come first. */
    onToggle: (next: boolean) => void;
  }

  let { title, description, enabled, disabled = false, onToggle }: Props = $props();
</script>

<Card class="gap-0 py-0">
  <CardHeader class="border-b py-4">
    <CardTitle><h2 class="text-sm">{t(messages.title)}</h2></CardTitle>
  </CardHeader>
  <CardContent class="flex items-center justify-between gap-6 py-4">
    <div class="min-w-0">
      <p class="text-sm font-medium">{title}</p>
      <p class="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch
      aria-label={title}
      {disabled}
      bind:checked={() => enabled, next => onToggle(next)}
    />
  </CardContent>
</Card>
