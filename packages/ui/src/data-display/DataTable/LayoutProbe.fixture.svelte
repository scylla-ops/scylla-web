<!-- A cell that prints the layout its table hands down. -->
<script lang="ts">
  import { getDataTableLayout } from './data-table-layout.ts';

  const layout = getDataTableLayout();
</script>

<span>{layout.isCard ? 'in a card' : 'in a table'}</span>
