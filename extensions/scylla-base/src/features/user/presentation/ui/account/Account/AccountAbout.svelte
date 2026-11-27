<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import { createQuery } from '@scylla/core-sdk';
  import { GlyphAvatarCredit } from '@scylla/ui';
  import {
    Badge,
    type BadgeVariant,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { appQueries } from '@base/features/apps';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  const server = createQuery(() => appQueries.server());
  // The version text of this build, from the Vite configuration (`tooling/vite.ts`).
  const webVersion: string = import.meta.env.SCYLLA_WEB_VERSION ?? '';
  const headingId = $props.id();
</script>

{#snippet fact(
  label: MessageDescriptor,
  value: string | undefined,
  variant: BadgeVariant,
  valueClass = '',
)}
  <div class="flex flex-col items-center gap-1.5">
    <dt class="text-muted-foreground">{t(label)}</dt>
    <dd class="flex">
      <Badge {variant} class="h-4.5">
        <span class="[text-box:trim-both_cap_alphabetic] {valueClass}">{value || '–'}</span>
      </Badge>
    </dd>
  </div>
{/snippet}

<section aria-labelledby={headingId} class="mx-auto w-full max-w-md">
  <Card class="text-center">
    <CardHeader>
      <CardTitle>
        <h2 id={headingId} class="text-base">{t(userMessages.versions)}</h2>
      </CardTitle>
      <CardDescription>{t(userMessages.versionsDescription)}</CardDescription>
    </CardHeader>
    <CardContent>
      <dl class="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs">
        <!-- The server names its edition in lower case: `community`. -->
        {@render fact(userMessages.edition, server.data?.edition, 'outline', 'capitalize')}
        {@render fact(userMessages.webApp, webVersion, 'secondary')}
        {@render fact(userMessages.server, server.data?.version, 'secondary')}
      </dl>
      <!-- The license of the style of the glyph avatars asks for this credit. -->
      <GlyphAvatarCredit class="mt-4" />
    </CardContent>
  </Card>
</section>
