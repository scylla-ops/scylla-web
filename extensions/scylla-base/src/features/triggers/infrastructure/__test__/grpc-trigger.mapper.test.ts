// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcTrigger from '../grpc-trigger.mapper.ts';
import { FireStatus, type Trigger } from '@base/generated/scylla/pipelines/v1/trigger.ts';
import type { TriggerDraft } from '@base/features/triggers/domain/entities/trigger.entity.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';
const API = 'https://api.example.com';

const baseTrigger = (overrides: Partial<Trigger> = {}): Trigger => ({
  id: { value: 'trigger-1' },
  pipelineId: { value: 'pipeline-1' },
  name: 'github-push',
  kind: { oneofKind: 'webhook', webhook: { path: '/webhooks/trigger-1' } },
  inputs: [],
  enabled: false,
  lastStatus: FireStatus.UNSPECIFIED,
  lastError: '',
  createdAt: TS,
  updatedAt: TS,
  ...overrides,
});

describe('grpcTrigger.toDomain', () => {
  it('unwraps the ids and formats the times', () => {
    expect(grpcTrigger.toDomain(baseTrigger())).toMatchObject({
      id: 'trigger-1',
      pipelineId: 'pipeline-1',
      name: 'github-push',
      enabled: false,
      createdAt: ISO,
      updatedAt: ISO,
    });
  });

  describe('kind', () => {
    it('maps a cron', () => {
      const domain = grpcTrigger.toDomain(
        baseTrigger({ kind: { oneofKind: 'cron', cron: { schedule: '0 9 * * *' } } }),
      );
      expect(domain.source).toEqual({ kind: 'cron', expression: '0 9 * * *' });
    });

    it('makes the address of a webhook from the API and its path', () => {
      expect(grpcTrigger.toDomain(baseTrigger(), API).source).toEqual({
        kind: 'webhook',
        webhookUrl: 'https://api.example.com/webhooks/trigger-1',
      });
    });

    it('maps a kind arm newer than this build to unknown rather than a guess', () => {
      const domain = grpcTrigger.toDomain(baseTrigger({ kind: { oneofKind: undefined } }));
      expect(domain.source).toEqual({ kind: 'unknown' });
    });
  });

  describe('activation', () => {
    it('gives a disabled trigger no due time, even if the server has one', () => {
      const domain = grpcTrigger.toDomain(baseTrigger({ enabled: false, nextFireAt: TS }));
      expect(domain.enabled).toBe(false);
      expect(domain.nextFireAt).toBeUndefined();
    });

    it('gives an enabled trigger its due time', () => {
      const domain = grpcTrigger.toDomain(baseTrigger({ enabled: true, nextFireAt: TS }));
      expect(domain).toMatchObject({ enabled: true, nextFireAt: ISO });
    });

    it('gives an enabled trigger with no due time yet none', () => {
      expect(grpcTrigger.toDomain(baseTrigger({ enabled: true })).nextFireAt).toBeUndefined();
    });
  });

  describe('last fire', () => {
    it('is absent before the first fire', () => {
      const domain = grpcTrigger.toDomain(baseTrigger());
      expect(domain.lastFiredAt).toBeUndefined();
      expect(domain.lastResult).toBeUndefined();
    });

    it('carries the time and a success', () => {
      const domain = grpcTrigger.toDomain(
        baseTrigger({ lastFiredAt: TS, lastStatus: FireStatus.OK }),
      );
      expect(domain).toMatchObject({ lastFiredAt: ISO, lastResult: { kind: 'succeeded' } });
    });

    it('carries the error of a failure', () => {
      const domain = grpcTrigger.toDomain(
        baseTrigger({ lastFiredAt: TS, lastStatus: FireStatus.ERROR, lastError: 'no agent' }),
      );
      expect(domain.lastResult).toEqual({ kind: 'failed', error: 'no agent' });
    });

    it('maps a status newer than this build to unknown (neither success nor failure)', () => {
      const domain = grpcTrigger.toDomain(
        baseTrigger({ lastFiredAt: TS, lastStatus: FireStatus.UNSPECIFIED }),
      );
      expect(domain.lastResult).toEqual({ kind: 'unknown' });
    });
  });

  describe('inputs', () => {
    it('maps a literal and a JSON pointer', () => {
      const domain = grpcTrigger.toDomain(
        baseTrigger({
          inputs: [
            { name: 'ENV', value: { oneofKind: 'literal', literal: 'prod' } },
            { name: 'REF', value: { oneofKind: 'jsonPointer', jsonPointer: '/ref' } },
          ],
        }),
      );
      expect(domain.inputs).toEqual([
        { key: 'ENV', value: { kind: 'literal', value: 'prod' } },
        { key: 'REF', value: { kind: 'jsonPointer', value: '/ref' } },
      ]);
    });

    it('maps a value arm newer than this build to an empty literal', () => {
      const domain = grpcTrigger.toDomain(
        baseTrigger({ inputs: [{ name: 'X', value: { oneofKind: undefined } }] }),
      );
      expect(domain.inputs).toEqual([{ key: 'X', value: { kind: 'literal', value: '' } }]);
    });
  });
});

describe('grpcTrigger.createdToDomain', () => {
  it('carries the one-time webhook secret with the mapped trigger', () => {
    const created = grpcTrigger.createdToDomain(
      { trigger: baseTrigger(), webhookSecret: 's3cret' },
      API,
    );
    expect(created.webhookSecret).toBe('s3cret');
    expect(created.trigger.id).toBe('trigger-1');
  });

  it('gives no secret for a cron', () => {
    expect(
      grpcTrigger.createdToDomain({ trigger: baseTrigger(), webhookSecret: '' }),
    ).not.toHaveProperty('webhookSecret');
  });

  it('throws when the answer has no trigger', () => {
    expect(() => grpcTrigger.createdToDomain({ webhookSecret: '' })).toThrow();
  });
});

describe('grpcTrigger draft -> proto', () => {
  const inputs: TriggerDraft['inputs'] = [
    { key: 'ENV', value: { kind: 'literal', value: 'prod' } },
    { key: 'REF', value: { kind: 'jsonPointer', value: '/ref' } },
  ];
  const protoInputs = [
    { name: 'ENV', value: { oneofKind: 'literal', literal: 'prod' } },
    { name: 'REF', value: { oneofKind: 'jsonPointer', jsonPointer: '/ref' } },
  ];

  it('builds a CreateTriggerRequest for a cron', () => {
    expect(
      grpcTrigger.draftToCreateRequest('pipeline-1', {
        name: 'nightly',
        source: { kind: 'cron', expression: '0 2 * * *' },
        inputs: [],
      }),
    ).toEqual({
      pipelineId: { value: 'pipeline-1' },
      name: 'nightly',
      kind: { oneofKind: 'cron', cron: { schedule: '0 2 * * *' } },
      inputs: [],
    });
  });

  it('builds a CreateTriggerRequest for a webhook, its inputs included', () => {
    expect(
      grpcTrigger.draftToCreateRequest('pipeline-1', {
        name: 'push',
        source: { kind: 'webhook' },
        inputs,
      }),
    ).toEqual({
      pipelineId: { value: 'pipeline-1' },
      name: 'push',
      kind: { oneofKind: 'webhook', webhook: { path: '' } },
      inputs: protoInputs,
    });
  });

  it('sends the schedule of a cron in an update, and the inputs in a list', () => {
    expect(
      grpcTrigger.draftToUpdateRequest('trigger-1', {
        name: 'nightly',
        source: { kind: 'cron', expression: '0 3 * * *' },
        inputs,
      }),
    ).toEqual({
      triggerId: { value: 'trigger-1' },
      name: 'nightly',
      schedule: '0 3 * * *',
      inputs: { inputs: protoInputs },
    });
  });

  it('sends no schedule in the update of a webhook', () => {
    expect(
      grpcTrigger.draftToUpdateRequest('trigger-1', {
        name: 'push',
        source: { kind: 'webhook' },
        inputs: [],
      }),
    ).not.toHaveProperty('schedule');
  });
});
