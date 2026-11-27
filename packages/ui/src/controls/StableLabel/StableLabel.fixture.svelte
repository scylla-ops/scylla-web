<script lang="ts">
  import { Button } from '../../primitives/index.ts';
  import StableLabel from './StableLabel.svelte';

  let { pending = false }: { pending?: boolean } = $props();
</script>

<!-- A footer of a dialog: Cancel, then the submit, aligned to the right. -->
<div class="flex justify-end gap-2">
  <Button variant="outline">Cancel</Button>
  <Button type="submit" disabled={pending}>
    <StableLabel text={pending ? 'Saving...' : 'Save'} reserve={['Save', 'Saving...']} busy={pending} />
  </Button>
</div>
