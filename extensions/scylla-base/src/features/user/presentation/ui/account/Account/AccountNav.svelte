<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { ACCOUNT_SECTIONS, type AccountSectionId } from './account-sections.registry.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  interface Props {
    /** The URL of the account page, without the section. */
    base: string;
    current: AccountSectionId;
  }

  let { base, current }: Props = $props();
</script>

<nav aria-label={t(userMessages.accountSettings)} class="md:w-55 md:shrink-0">
  <ul class="relative -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:overflow-visible md:p-0">
    {#each ACCOUNT_SECTIONS as section (section.id)}
      <li class={cn(section.danger && 'md:mt-2 md:border-t md:pt-2')}>
        <a
          href="{base}/{section.id}"
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
