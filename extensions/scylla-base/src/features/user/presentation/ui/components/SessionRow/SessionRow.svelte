<script lang="ts">
  import CircleHelpIcon from '@lucide/svelte/icons/circle-help';
  import MonitorIcon from '@lucide/svelte/icons/monitor';
  import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
  import TerminalIcon from '@lucide/svelte/icons/terminal';
  import { Badge, Button } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import type { UserSessionEntity } from '../../../../domain/entities/user-session.entity.ts';
  import { parseUserAgent } from '../../../user-agent.calculator.ts';
  import { userMessages } from '../../user.messages.ts';
  import { sessionActivity, sessionTitle } from './session-row.ts';

  interface Props {
    session: UserSessionEntity;
    /** The time the last activity is measured from, in milliseconds. */
    now: number;
    canRevoke: boolean;
    disabled?: boolean;
    onRevoke: (sessionId: string) => void;
  }

  let { session, now, canRevoke, disabled = false, onRevoke }: Props = $props();

  const ICONS = {
    desktop: MonitorIcon,
    mobile: SmartphoneIcon,
    api: TerminalIcon,
    unknown: CircleHelpIcon,
  };

  const device = $derived(parseUserAgent(session.userAgent));
  const title = $derived(sessionTitle(device));
  const activity = $derived(sessionActivity(device, session, now));
  const Icon = $derived(ICONS[device.kind]);
</script>

<div class="flex items-center gap-3 py-3" data-kind={device.kind}>
  <span
    aria-hidden="true"
    class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
  >
    <Icon class="size-4" />
  </span>
  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
    <p class="flex min-w-0 flex-wrap items-center gap-2">
      <span class="truncate text-sm font-semibold" title={session.userAgent || undefined}>
        {title}
      </span>
      {#if session.current}
        <Badge>{t(userMessages.thisSession)}</Badge>
      {/if}
    </p>
    {#if activity}
      <p class="truncate text-xs text-muted-foreground">{activity}</p>
    {/if}
  </div>
  {#if canRevoke && !session.current}
    <Button
      variant="outline"
      size="sm"
      {disabled}
      aria-label={t(userMessages.signOutSession(title))}
      onclick={() => onRevoke(session.sessionId)}
    >
      {t(userMessages.signOut)}
    </Button>
  {/if}
</div>
