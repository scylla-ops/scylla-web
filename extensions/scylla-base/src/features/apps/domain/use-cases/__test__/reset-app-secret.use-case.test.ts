// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { AppSecretEntity } from '@base/features/apps/domain/entities/app.entity.ts';
import type { AppsRepository } from '@base/features/apps/domain/repository/apps.repository.ts';
import { ResetAppSecretUseCase } from '../reset-app-secret.use-case.ts';

const secret = (id: string, label: string): AppSecretEntity => ({
  id,
  appId: 'app-1',
  label,
  enabled: true,
  createdAt: '',
  updatedAt: '',
});

const input = { appId: 'app-1', label: 'runner.local', revokeOthers: true };

let repository: AppsRepository;
let useCase: ResetAppSecretUseCase;

beforeEach(() => {
  repository = {
    listAppSecrets: vi.fn().mockResolvedValue([secret('s-1', 'default'), secret('s-2', 'ci')]),
    createAppSecret: vi
      .fn()
      .mockImplementation((_appId: string, label: string) =>
        Promise.resolve({ credential: secret('s-new', label), secret: 'plaintext' }),
      ),
    revokeAppSecret: vi.fn().mockResolvedValue(undefined),
  } as unknown as AppsRepository;
  useCase = new ResetAppSecretUseCase(repository);
});

describe('ResetAppSecretUseCase', () => {
  it('creates the secret with the label of the user, then revokes the secrets before it', async () => {
    const result = await useCase.execute({
      appId: 'app-1',
      label: ' runner.local ',
      revokeOthers: true,
    });

    expect(repository.createAppSecret).toHaveBeenCalledWith('app-1', 'runner.local');
    expect(repository.revokeAppSecret).toHaveBeenCalledWith('s-1');
    expect(repository.revokeAppSecret).toHaveBeenCalledWith('s-2');
    expect(repository.revokeAppSecret).not.toHaveBeenCalledWith('s-new');
    expect(result.created.secret).toBe('plaintext');
    expect(result.revoked.map(s => s.label)).toEqual(['default', 'ci']);
    expect(result.kept).toEqual([]);
  });

  it('trims the label as CE does: a leading U+0085 goes, which JS trim keeps', async () => {
    await useCase.execute({ ...input, label: '\u0085abc' });

    expect(repository.createAppSecret).toHaveBeenCalledWith('app-1', 'abc');
  });

  it('revokes nothing when asked to keep the old secrets', async () => {
    const result = await useCase.execute({
      appId: 'app-1',
      label: 'runner.local',
      revokeOthers: false,
    });

    expect(repository.revokeAppSecret).not.toHaveBeenCalled();
    expect(result.kept.map(s => s.label)).toEqual(['default', 'ci']);
  });

  it('still returns the new secret when a revoke fails: it is shown only once', async () => {
    vi.mocked(repository.revokeAppSecret).mockImplementation(id =>
      id === 's-2' ? Promise.reject(new ScyllaError('denied')) : Promise.resolve(),
    );

    const result = await useCase.execute(input);

    expect(result.created.secret).toBe('plaintext');
    expect(result.revoked.map(s => s.id)).toEqual(['s-1']);
    expect(result.failed.map(s => s.id)).toEqual(['s-2']);
  });

  it('creates nothing when the secrets cannot be listed', async () => {
    vi.mocked(repository.listAppSecrets).mockRejectedValue(new ScyllaError('denied'));

    await expect(useCase.execute(input)).rejects.toThrow('denied');
    expect(repository.createAppSecret).not.toHaveBeenCalled();
  });

  it('revokes nothing when the new secret could not be created', async () => {
    vi.mocked(repository.createAppSecret).mockRejectedValue(
      new ScyllaError('taken', { code: 'ALREADY_EXISTS' }),
    );

    await expect(useCase.execute(input)).rejects.toThrow('taken');
    expect(repository.revokeAppSecret).not.toHaveBeenCalled();
  });
});
