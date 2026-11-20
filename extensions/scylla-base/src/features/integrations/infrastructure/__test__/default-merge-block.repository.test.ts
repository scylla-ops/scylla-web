// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IMergeBlockServiceClient } from '@base/generated/scylla/integrations/v1/merge_block_service.client.ts';
import { MergeBlockState, type MergeBlock } from '@base/generated/scylla/integrations/v1/vcs.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultMergeBlockRepository } from '../default-merge-block.repository.ts';

const TS = { seconds: 1735689600n, nanos: 0 };

const wire = (patch: Partial<MergeBlock> = {}): MergeBlock => ({
  projectId: { value: 'p-1' },
  pipelineId: { value: 'pl-1' },
  context: 'scylla/build',
  enabled: true,
  state: MergeBlockState.ON,
  stateReason: '',
  branch: 'main',
  actionUrl: 'https://github.com/acme/api/rules',
  updatedAt: TS,
  ...patch,
});

describe('DefaultMergeBlockRepository', () => {
  it('maps the rules of a project: one for each pipeline, or one for the project', async () => {
    const listMergeBlocks = vi.fn(() =>
      unaryCall({
        blocks: [
          wire(),
          wire({
            pipelineId: undefined,
            context: '',
            enabled: false,
            state: MergeBlockState.NEEDS_PERMISSION,
            stateReason: 'ROLE_TOO_LOW',
          }),
          wire({ state: 42 as MergeBlockState }),
        ],
      }),
    );
    const repository = new DefaultMergeBlockRepository({
      listMergeBlocks,
    } as unknown as IMergeBlockServiceClient);

    const blocks = await repository.listByProject('p-1');

    expect(blocks[0]).toEqual({
      projectId: 'p-1',
      pipelineId: 'pl-1',
      context: 'scylla/build',
      enabled: true,
      state: 'on',
      stateReason: '',
      branch: 'main',
      actionUrl: 'https://github.com/acme/api/rules',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    expect(blocks[1]).not.toHaveProperty('pipelineId');
    expect(blocks[1]).toMatchObject({ state: 'needs_permission', stateReason: 'ROLE_TOO_LOW' });
    expect(blocks[2].state).toBe('failed');
  });

  it('sends no pipeline for the rule of the project', async () => {
    const setMergeBlock = vi.fn(() => unaryCall({ block: wire({ pipelineId: undefined }) }));
    const repository = new DefaultMergeBlockRepository({
      setMergeBlock,
    } as unknown as IMergeBlockServiceClient);

    await repository.set({ projectId: 'p-1', enabled: true });

    expect(setMergeBlock).toHaveBeenCalledWith({
      projectId: { value: 'p-1' },
      pipelineId: undefined,
      enabled: true,
    });
  });
});
