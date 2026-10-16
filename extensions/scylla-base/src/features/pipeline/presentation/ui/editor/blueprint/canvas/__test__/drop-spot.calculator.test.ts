// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { linkDropPoint } from '../drop-spot.calculator.ts';

type Connection = Parameters<typeof linkDropPoint>[0];

/** The fields `linkDropPoint` reads, from a link in progress. */
const pulling = (handle: 'source' | 'target', toNode: object | null): Connection =>
  ({
    inProgress: true,
    fromHandle: { type: handle },
    to: { x: 300, y: 120 },
    toNode,
  }) as unknown as Connection;

describe('linkDropPoint', () => {
  it('is the pointer while a link from an output is over empty canvas', () => {
    expect(linkDropPoint(pulling('source', null))).toEqual({ x: 300, y: 120 });
  });

  it('is nothing over a node: the link connects to it, it creates no step', () => {
    expect(linkDropPoint(pulling('source', { id: 'build' }))).toBeNull();
  });

  it('is nothing for a link pulled from an input, or with no link', () => {
    expect(linkDropPoint(pulling('target', null))).toBeNull();
    expect(linkDropPoint({ inProgress: false } as unknown as Connection)).toBeNull();
  });
});
