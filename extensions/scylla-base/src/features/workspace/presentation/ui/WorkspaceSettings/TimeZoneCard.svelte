<script lang="ts">
  import { SearchSelect } from '@scylla/ui';
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { workspaceSettingsMessages as messages } from '@base/features/workspace/presentation/messages/workspace-settings.messages.ts';
  import {
    browserTimeZone,
    browserTimeZones,
    timeZoneOptions,
  } from '@base/features/workspace/presentation/presenters/time-zone.presenter.ts';

  interface Props {
    name: string;
    timeZone: string;
    disabled?: boolean;
    /** The field shows `timeZone` until the owner of the card saves the new zone. */
    onChange: (timeZone: string) => void;
  }

  let { name, timeZone, disabled = false, onChange }: Props = $props();

  const browser = browserTimeZone();
  const options = $derived(
    timeZoneOptions(browserTimeZones(), timeZone, browser, t(messages.thisBrowser)),
  );
</script>

<Card class="gap-0 py-0">
  <CardHeader class="flex items-center border-b py-4 [.border-b]:pb-4">
    <CardTitle><h2 class="text-sm">{t(messages.timeZone)}</h2></CardTitle>
  </CardHeader>
  <CardContent
    class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
  >
    <div class="min-w-0">
      <p class="text-sm font-medium">{t(messages.timeZoneOf(name))}</p>
      <p class="text-xs text-muted-foreground">{t(messages.timeZoneBody(name, browser))}</p>
    </div>
    <SearchSelect
      class="sm:w-64 sm:shrink-0"
      {options}
      {disabled}
      aria-label={t(messages.timeZoneOf(name))}
      placeholder={t(messages.findTimeZone)}
      bind:value={
        () => timeZone,
        next => {
          if (next && next !== timeZone) onChange(next);
        }
      }
    />
  </CardContent>
</Card>
