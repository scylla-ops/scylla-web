<script lang="ts">
  import type { LoginZoneContext } from '@scylla/base-sdk';

  let { context }: { context: LoginZoneContext } = $props();
</script>

<button type="button" disabled={context.isPending}>Need help?</button>
