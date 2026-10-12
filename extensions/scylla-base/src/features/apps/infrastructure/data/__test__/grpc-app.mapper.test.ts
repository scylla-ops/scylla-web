// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { GrpcAppMapper } from '../grpc-app.mapper';
import type { App, AppAccess, AppSecret } from '@base/generated/scylla/app/v1/app.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

describe('GrpcAppMapper.toDomain', () => {
  it('unwraps ids and formats timestamps', () => {
    const app: App = {
      appId: { value: 'app-1' },
      organizationId: { value: 'org-1' },
      name: 'ci-runner',
      isActive: true,
      createdAt: TS,
      updatedAt: TS,
    };
    expect(GrpcAppMapper.toDomain(app)).toEqual({
      id: 'app-1',
      organizationId: 'org-1',
      name: 'ci-runner',
      isActive: true,
      createdAt: ISO,
      updatedAt: ISO,
    });
  });

  it('defaults to empty ids when the wrappers are absent', () => {
    const app: App = {
      appId: undefined,
      organizationId: undefined,
      name: 'ci-runner',
      isActive: false,
      createdAt: TS,
      updatedAt: TS,
    };
    const domain = GrpcAppMapper.toDomain(app);
    expect(domain.id).toBe('');
    expect(domain.organizationId).toBe('');
  });
});

describe('GrpcAppMapper.secretToDomain', () => {
  it('unwraps ids, formats timestamps, and carries label/enabled through', () => {
    const secret: AppSecret = {
      appSecretId: { value: 'secret-1' },
      appId: { value: 'app-1' },
      label: 'ci-runner-key',
      enabled: true,
      createdAt: TS,
      updatedAt: TS,
    };
    expect(GrpcAppMapper.secretToDomain(secret)).toEqual({
      id: 'secret-1',
      appId: 'app-1',
      label: 'ci-runner-key',
      enabled: true,
      createdAt: ISO,
      updatedAt: ISO,
    });
  });
});

describe('GrpcAppMapper requests', () => {
  it('sends no first secret label, so CE names the first secret with the app name', () => {
    const request = GrpcAppMapper.toCreateAppRequest('org-1', 'ci-runner');

    expect(request).toEqual({ organizationId: { value: 'org-1' }, name: 'ci-runner' });
    expect(request).not.toHaveProperty('secretLabel');
  });

  it('names the secret and the new label of a rename', () => {
    expect(GrpcAppMapper.toSetSecretLabelRequest('secret-1', 'runner.local')).toEqual({
      appSecretId: { value: 'secret-1' },
      label: 'runner.local',
    });
  });
});

describe('GrpcAppMapper.accessToDomain', () => {
  const base = {
    grantId: { value: 'grant-1' },
    organizationId: { value: 'org-1' },
    organizationName: 'Acme',
    projectName: '',
    roleId: { value: 'role-1' },
    roleName: 'Organization agent',
  };

  it('keeps the project of a project grant, with its names', () => {
    const access: AppAccess = {
      ...base,
      projectName: 'prelude',
      scope: { scope: { oneofKind: 'project', project: { projectId: { value: 'p-1' } } } },
    };

    expect(GrpcAppMapper.accessToDomain(access)).toEqual({
      grantId: 'grant-1',
      scope: 'project',
      scopeId: 'p-1',
      organizationId: 'org-1',
      organizationName: 'Acme',
      projectName: 'prelude',
      roleId: 'role-1',
      roleName: 'Organization agent',
    });
  });

  it('gives a system grant no scope id and no organization', () => {
    const access: AppAccess = {
      ...base,
      organizationId: undefined,
      organizationName: '',
      scope: { scope: { oneofKind: 'system', system: {} } },
    };

    expect(GrpcAppMapper.accessToDomain(access)).toMatchObject({
      scope: 'system',
      scopeId: '',
      organizationId: null,
    });
  });

  it('drops a scope this build does not know, rather than guessing one', () => {
    const access: AppAccess = { ...base, scope: { scope: { oneofKind: undefined } } };

    expect(GrpcAppMapper.accessToDomain(access)).toBeNull();
  });
});
