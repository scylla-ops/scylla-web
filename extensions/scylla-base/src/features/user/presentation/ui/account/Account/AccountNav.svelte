<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { ACCOUNT_SECTIONS, type AccountSectionId } from './account-sections.registry.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  let { current }: { current: AccountSectionId } = $props();
</script>

<nav aria-label={t(userMessages.accountSettings)} class="md:w-55 md:shrink-0">
  <ul class="flex flex-wrap gap-1 md:flex-col">
    {#each ACCOUNT_SECTIONS as section (section.id)}
      <li class={cn(section.danger && 'md:mt-2 md:border-t md:pt-2')}>
        <a
          href="/account/{section.id}"
          aria-current={section.id === current ? 'page' : undefined}
          class={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-muted',
            section.id === current && 'bg-muted font-medium',
            section.danger && 'text-destructive',
          )}
        >
          <section.icon class="size-4 shrink-0" />
          {t(section.title)}
        </a>
      </li>
    {/each}
  </ul>
</nav>
