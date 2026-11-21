// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { ILegalServiceClient } from '@base/generated/scylla/platform/v1/legal_service.client.ts';
import { LegalDocumentKind } from '@base/generated/scylla/platform/v1/legal_service.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultLegalRepository } from '../default-legal.repository.ts';

const info = {
  operator: {
    name: 'Acme SAS',
    address: '',
    registration: '',
    publicationDirector: '',
    contact: '',
    host: '',
  },
  privacyContact: 'privacy@acme.example',
  documents: [
    {
      kind: LegalDocumentKind.TERMS,
      title: '',
      content: { oneofKind: 'markdown' as const, markdown: '# Terms' },
      version: '2.0',
      effectiveDate: '2027-01-01',
      acceptanceRequired: true,
      updatedAt: { seconds: 1_800_000_000n, nanos: 0 },
    },
    {
      kind: LegalDocumentKind.PRIVACY,
      title: 'Privacy',
      content: { oneofKind: 'url' as const, url: 'https://acme.example/privacy' },
      version: '',
      effectiveDate: '',
      acceptanceRequired: false,
    },
    // A kind of a newer server: this build leaves it out.
    {
      kind: 99 as LegalDocumentKind,
      title: '',
      content: { oneofKind: 'url' as const, url: 'https://acme.example' },
      version: '',
      effectiveDate: '',
      acceptanceRequired: false,
    },
  ],
};

const clientWith = () => {
  const client = {
    getLegalInfo: vi.fn(() => unaryCall({ info })),
    updateLegalSettings: vi.fn(() => unaryCall({ info })),
  };
  return {
    client,
    repository: new DefaultLegalRepository(client as unknown as ILegalServiceClient),
  };
};

describe('DefaultLegalRepository', () => {
  it('reads the documents of the kinds that this build knows', async () => {
    const { repository } = clientWith();

    const read = await repository.info();

    expect(read.operator.name).toBe('Acme SAS');
    expect(read.privacyContact).toBe('privacy@acme.example');
    expect(read.documents).toEqual([
      {
        kind: 'terms',
        title: '',
        content: { type: 'markdown', markdown: '# Terms' },
        version: '2.0',
        effectiveDate: '2027-01-01',
        acceptanceRequired: true,
        updatedAt: '2027-01-15T08:00:00.000Z',
      },
      {
        kind: 'privacy',
        title: 'Privacy',
        content: { type: 'url', url: 'https://acme.example/privacy' },
        version: '',
        effectiveDate: null,
        acceptanceRequired: false,
        updatedAt: null,
      },
    ]);
  });

  it('sends a kind with no content to turn it off, and only the fields that change', async () => {
    const { client, repository } = clientWith();

    await repository.update({
      documents: [
        {
          kind: 'cookies',
          title: '',
          content: null,
          version: '',
          effectiveDate: '',
          acceptanceRequired: false,
        },
      ],
    });

    expect(client.updateLegalSettings).toHaveBeenCalledWith({
      operator: undefined,
      privacyContact: undefined,
      documents: [
        {
          kind: LegalDocumentKind.COOKIES,
          title: '',
          content: { oneofKind: undefined },
          version: '',
          effectiveDate: '',
          acceptanceRequired: false,
        },
      ],
    });
  });
});
