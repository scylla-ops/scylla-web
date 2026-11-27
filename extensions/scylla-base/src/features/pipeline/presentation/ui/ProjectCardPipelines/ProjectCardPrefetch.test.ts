import { describe, it, expect, vi, afterEach } from 'vitest';
import { waitFor } from '@testing-library/svelte';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import ProjectCardPrefetch from './ProjectCardPrefetch.svelte';

describe('ProjectCardPrefetch', () => {
  let teardown: Array<() => void> = [];
  afterEach(() => {
    teardown.forEach(fn => fn());
    teardown = [];
  });

  it('reads the pipelines of each batch of the folded sections, once each', async () => {
    const getSummaries = vi.fn().mockResolvedValue({ items: [], total: 0, green: 0 });
    teardown = [
      withQueryClient().restore,
      withRegistry({ pipeline: { pipelineRepository: { getSummaries } } }),
    ];

    render(ProjectCardPrefetch, {
      props: { context: { workspaceId: 'org-1', batches: [['a', 'b'], ['c']] } },
    });

    await waitFor(() => expect(getSummaries).toHaveBeenCalledTimes(2));
    expect(getSummaries.mock.calls.map(([query]) => query.projectIds)).toEqual([['a', 'b'], ['c']]);
  });
});
