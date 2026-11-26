// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { fromIconChange, toDomain, toDomainPage } from '../grpc-project.mapper.ts';

const project = (id: string) => ({
  id: { value: id },
  workspaceId: { value: 'ws-1' },
  name: `Project ${id}`,
  description: 'about it',
});

describe('grpcProject.toDomain', () => {
  it('unwraps the ids and keeps the name and the description', () => {
    expect(toDomain(project('p-1'))).toEqual({
      id: 'p-1',
      workspaceId: 'ws-1',
      name: 'Project p-1',
      description: 'about it',
    });
  });
});

describe('grpcProject.toDomain: the icon', () => {
  it('reads a glyph with its color, and a glyph with the default color', () => {
    const glyph = (color: string) => ({
      ...project('p-1'),
      icon: { kind: { oneofKind: 'glyph' as const, glyph: { name: 'rocket', color } } },
    });

    expect(toDomain(glyph('#e879f9')).icon).toEqual({
      kind: 'glyph',
      name: 'rocket',
      color: '#e879f9',
    });
    expect(toDomain(glyph('')).icon).toEqual({ kind: 'glyph', name: 'rocket' });
  });

  it('reads the id of an image', () => {
    const icon = { kind: { oneofKind: 'imageId' as const, imageId: { value: 'img-1' } } };

    expect(toDomain({ ...project('p-1'), icon }).icon).toEqual({ kind: 'image', imageId: 'img-1' });
  });

  it('gives no icon for no icon, or a kind that it does not know', () => {
    expect(toDomain(project('p-1'))).not.toHaveProperty('icon');
    const icon = { kind: { oneofKind: undefined } };
    expect(toDomain({ ...project('p-1'), icon })).not.toHaveProperty('icon');
  });
});

describe('grpcProject.fromIconChange', () => {
  it('sends a glyph, the bytes of an image, or no kind for the default icon', () => {
    const data = new Uint8Array([137, 80, 78, 71]);

    expect(fromIconChange({ kind: 'glyph', name: 'rocket', color: 'chart-2' })).toEqual({
      kind: { oneofKind: 'glyph', glyph: { name: 'rocket', color: 'chart-2' } },
    });
    expect(fromIconChange({ kind: 'image', data })).toEqual({
      kind: { oneofKind: 'image', image: data },
    });
    expect(fromIconChange({ kind: 'default' })).toEqual({ kind: { oneofKind: undefined } });
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
