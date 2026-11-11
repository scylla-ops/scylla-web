// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { ITriggerServiceClient } from '@base/generated/scylla/pipelines/v1/trigger_service.client.ts';
import { FireStatus, type Trigger } from '@base/generated/scylla/pipelines/v1/trigger.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultTriggersRepository } from '../default-triggers.repository.ts';

const trigger = (id: string): Trigger => ({
  id: { value: id },
  pipelineId: { value: 'pipeline-1' },
  name: id,
  kind: { oneofKind: 'webhook', webhook: { path: `/webhooks/${id}` } },
  inputs: [],
  enabled: true,
  lastStatus: FireStatus.UNSPECIFIED,
  lastError: '',
  fromFile: false,
});

describe('DefaultTriggersRepository', () => {
  it('reads every page, and gives the webhooks the address of the API', async () => {
    const listPipelineTriggers = vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { triggers: [trigger('a')], page: { nextToken: 'n' } }
          : { triggers: [trigger('b')], page: { nextToken: '' } },
      ),
    );
    const repository = new DefaultTriggersRepository(
      { listPipelineTriggers } as unknown as ITriggerServiceClient,
      () => 'https://api.example.com',
    );

    const triggers = await repository.listByPipelineId('pipeline-1');

    expect(triggers.map(item => item.id)).toEqual(['a', 'b']);
    expect(triggers[1].source).toEqual({
      kind: 'webhook',
      webhookUrl: 'https://api.example.com/webhooks/b',
    });
  });

  it('gives the id of the job of a fire', async () => {
    const repository = new DefaultTriggersRepository({
      fireTriggerNow: vi.fn(() => unaryCall({ job: { id: { value: 'job-9' } } })),
    } as unknown as ITriggerServiceClient);

    await expect(repository.fireNow('a')).resolves.toBe('job-9');
  });
});
