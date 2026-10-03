import { describe, it, expect, vi, afterEach } from 'vitest';
import { withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { runMutationFn, runQueryFn } from '@test/queries.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { OnboardingRepository } from '../../domain/repository/onboarding.repository.ts';
import {
  ONBOARDING_QUERY_KEY,
  onboardingMutations,
  onboardingQueries,
} from '../onboarding.queries.ts';

let teardown: Array<() => void> = [];

const setUp = () => {
  const repository: OnboardingRepository = {
    getStatus: vi.fn(() => Promise.resolve(ScyllaResult.success({ kind: 'skipped' as const }))),
    saveStatus: vi.fn(() => Promise.resolve(ScyllaResult.success(undefined))),
  };
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ onboarding: { onboardingRepository: repository } })];
  return { repository, queryClient: cache.queryClient };
};

afterEach(() => teardown.forEach(restore => restore()));

describe('onboardingQueries', () => {
  it('reads the progress of the given user', async () => {
    const { repository } = setUp();

    const status = await runQueryFn(onboardingQueries.status('ada'));

    expect(status).toEqual({ kind: 'skipped' });
    expect(repository.getStatus).toHaveBeenCalledWith('ada');
  });

  it('keys the progress per user', () => {
    expect(onboardingQueries.status('ada').queryKey).toEqual(ONBOARDING_QUERY_KEY('ada'));
    expect(ONBOARDING_QUERY_KEY('ada')).not.toEqual(ONBOARDING_QUERY_KEY('grace'));
  });
});

describe('onboardingMutations.save', () => {
  it('shows the new status before the write completes', () => {
    const { queryClient } = setUp();
    const options = onboardingMutations.save('ada');

    void options.onMutate?.({ kind: 'completed' }, undefined as never);

    expect(queryClient.getQueryData(ONBOARDING_QUERY_KEY('ada'))).toEqual({ kind: 'completed' });
  });

  it('writes the status for the user', async () => {
    const { repository } = setUp();

    await runMutationFn(onboardingMutations.save('ada'), { kind: 'in-progress', step: 'navbar' });

    expect(repository.saveStatus).toHaveBeenCalledWith('ada', {
      kind: 'in-progress',
      step: 'navbar',
    });
  });

  it('surfaces a failed write to the global handler', async () => {
    const { repository } = setUp();
    vi.mocked(repository.saveStatus).mockResolvedValue(
      ScyllaResult.try<void>(() => {
        throw new Error('full');
      }, 'Failed to save the onboarding progress'),
    );

    await expect(
      runMutationFn(onboardingMutations.save('ada'), { kind: 'skipped' }),
    ).rejects.toThrow('Failed to save the onboarding progress');
  });
});
