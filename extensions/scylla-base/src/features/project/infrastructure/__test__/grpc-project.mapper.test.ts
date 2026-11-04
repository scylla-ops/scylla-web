// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { toDomain, toDomainPage } from '../grpc-project.mapper.ts';

const project = (id: string) => ({
  id: { value: id },
  workspaceId: { value: 'ws-1' },
  name: `Project ${id}`,
  description: 'about it',
});

describe('grpcProject.toDomain', () => {
  it('unwraps the id and keeps the name and the description', () => {
    expect(toDomain(project('p-1'))).toEqual({
      id: 'p-1',
      name: 'Project p-1',
      description: 'about it',
    });
  });
});

describe('grpcProject.toDomainPage', () => {
  const all = ['a', 'b', 'c', 'd', 'e'].map(project);

  it('cuts the page that the UI asks for and counts the pages', () => {
    const page = toDomainPage(all, { page: 2, pageSize: 2 });

    expect(page.items.map(item => item.id)).toEqual(['c', 'd']);
    expect(page.pagination).toEqual({
      totalCount: 5,
      page: 2,
      pageSize: 2,
      totalPages: 3,
      hasNext: true,
      hasPrevious: true,
    });
  });

  it('has one empty page for no project', () => {
    expect(toDomainPage([], { page: 1, pageSize: 10 }).pagination).toMatchObject({
      totalPages: 1,
      hasNext: false,
    });
  });
});
