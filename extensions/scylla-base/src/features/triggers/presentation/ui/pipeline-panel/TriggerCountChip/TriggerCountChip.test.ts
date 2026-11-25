import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { TriggersRepository } from '@base/features/triggers/domain/repository/triggers.repository.ts';
import TriggerCountChip from './TriggerCountChip.svelte';

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let listByPipelineId: ReturnType<typeof vi.fn>;

beforeEach(() => {
  cache = withQueryClient();
  listByPipelineId = vi.fn();
  restoreRegistry = withRegistry({
    triggers: { triggersRepository: { listByPipelineId } as unknown as TriggersRepository },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
});

// `context` is also a mount option of Svelte: the props go in `props`.
const renderChip = () =>
  render(TriggerCountChip, { props: { context: { pipelineId: 'pipeline-1' } } });

describe('TriggerCountChip', () => {
  it('counts the triggers of the pipeline, the ones of its file too', async () => {
    listByPipelineId.mockResolvedValue([{ id: 'push', fromFile: true }, { id: 'nightly' }]);
    renderChip();

    expect(await screen.findByText('2 triggers')).toHaveClass('sr-only');
    expect(listByPipelineId).toHaveBeenCalledWith('pipeline-1');
  });

  it('shows nothing while the list loads, then a count of zero', async () => {
    let resolve: (triggers: unknown[]) => void = () => {};
    listByPipelineId.mockReturnValue(new Promise(done => (resolve = done)));
    const { container } = renderChip();

    expect(container).toHaveTextContent('');
    resolve([]);
    expect(await screen.findByText('0 triggers')).toBeInTheDocument();
  });
});
