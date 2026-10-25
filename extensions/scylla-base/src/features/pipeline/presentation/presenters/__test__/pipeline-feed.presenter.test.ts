// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { PipelineMetadata } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { asPipelineFeed } from '../pipeline-feed.presenter.ts';

const metadata: PipelineMetadata = {
  id: 'pipeline-1',
  projectId: 'project-1',
  name: 'ci',
  stepCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const paginated = (items: PipelineMetadata[], totalCount = items.length) => ({
  items,
  pagination: {
    totalCount,
    page: 1,
    pageSize: 100,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
});

describe('asPipelineFeed', () => {
  it('flags a window narrower than the full list', () => {
    expect(asPipelineFeed(paginated([metadata], 50))).toMatchObject({
      totalCount: 50,
      isPartialWindow: true,
    });
  });

  it('reads an absent page as an empty, complete one', () => {
    expect(asPipelineFeed(undefined)).toEqual({
      pipelines: [],
      totalCount: 0,
      isPartialWindow: false,
    });
  });
});