<script lang="ts">
  import { contextStore } from '@platform/context';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import ProjectList from './ProjectList.svelte';
  import { projectMessages } from './project.messages.ts';

  const context = toRune(contextStore);
  const organizationId = $derived(context().organization.id);
</script>

{#if !organizationId}
  <div class="flex h-full items-center justify-center">
    <div class="space-y-2 text-center">
      <p class="text-lg font-semibold text-muted-foreground">
        {t(projectMessages.noOrganization)}
      </p>
      <p class="text-sm text-muted-foreground">{t(projectMessages.noOrganizationHint)}</p>
    </div>
  </div>
{:else}
  <!-- Keyed on the organization: the page number resets on a switch. -->
  {#key organizationId}
    <ProjectList {organizationId} />
  {/key}
{/if}
