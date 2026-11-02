<script lang="ts">
  import { failsThisRender } from './broken-page.fixture.ts';

  if (failsThisRender()) throw new Error('broken page');
</script>

<p data-testid="broken-page">recovered</p>
