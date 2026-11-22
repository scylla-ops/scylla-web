<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import {
    Badge,
    Table,
    TableBody,
    TableCell,
    TableFrame,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import type { Tracker } from '../../../domain/structs/tracker.struct.ts';
  import { trackerTypes, trackersMessages as messages } from '../../messages/trackers.messages.ts';
  import { registeredTrackers } from '../../trackers.points.ts';

  interface Props {
    /** The trackers to list. By default, each tracker of the registry. */
    trackers?: readonly Tracker[];
  }

  let { trackers = registeredTrackers() }: Props = $props();
</script>

<!--
  The cookies and the storage keys: the cookie page and the admin page show this table. Three
  columns, so that it fits the width of a text: the type and the provider go under the name, the
  lifetime under the purpose.
-->
<TableFrame class="print:overflow-visible print:border-0 print:p-0">
  <Table aria-label={t(messages.label)}>
    <TableHeader>
      <TableRow>
        <TableHead>{t(messages.name)}</TableHead>
        <TableHead>{t(messages.purpose)}</TableHead>
        <TableHead>{t(messages.status)}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each trackers as tracker (`${tracker.type}:${tracker.name}`)}
        <TableRow>
          <TableCell>
            <p class="font-mono text-xs">{tracker.name}</p>
            <p class="text-xs text-muted-foreground">
              {t(messages.source(t(trackerTypes[tracker.type]), tracker.provider))}
            </p>
          </TableCell>
          <TableCell class="min-w-56 whitespace-normal">
            <p>{t(tracker.purpose)}</p>
            <p class="text-xs text-muted-foreground">
              {t(messages.lifetimeOf(t(tracker.lifetime)))}
            </p>
          </TableCell>
          <TableCell>
            {#if tracker.exempt}
              <Badge variant="secondary">{t(messages.exempt)}</Badge>
            {:else}
              <Badge variant="warning">{t(messages.needsConsent)}</Badge>
            {/if}
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</TableFrame>
