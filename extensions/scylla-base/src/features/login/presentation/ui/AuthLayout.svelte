<script lang="ts">
  import type { Snippet } from 'svelte';
  import LogoScylla from '@scylla/ui/assets/logo_scylla.svg';
  import LogoScyllaDark from '@scylla/ui/assets/logo_scylla_dark.svg';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@scylla/ui/shadcn';

  interface Props {
    title: string;
    description?: string;
    children: Snippet;
    /** Under the card. */
    below?: Snippet;
  }

  let { title, description, children, below }: Props = $props();
</script>

<!-- The frame of the public pages: the sign-in and the password reset. -->
<div class="flex min-h-svh flex-col items-center justify-center p-6">
  <!-- A dark variant swapped by CSS: `.dark` is set before the first paint, so no flash. -->
  <img src={LogoScylla} alt="Scylla" class="mb-8 w-56 dark:hidden" />
  <img src={LogoScyllaDark} alt="Scylla" class="mb-8 hidden w-56 dark:block" />

  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle><h1>{title}</h1></CardTitle>
      {#if description}
        <CardDescription>{description}</CardDescription>
      {/if}
    </CardHeader>
    <CardContent>{@render children()}</CardContent>
  </Card>

  {@render below?.()}
</div>
