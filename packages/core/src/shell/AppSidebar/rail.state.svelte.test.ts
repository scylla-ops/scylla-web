import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RAIL_CLOSE_DELAY_MS, RAIL_OPEN_DELAY_MS, RailState } from './rail.state.svelte.ts';

const stopped = (rail: RailState) => {
  rail.pointerMoved('mouse');
  vi.advanceTimersByTime(RAIL_OPEN_DELAY_MS);
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RailState', () => {
  it('opens only after the pointer stops on the rail', () => {
    const rail = new RailState();

    rail.pointerMoved('mouse');
    vi.advanceTimersByTime(RAIL_OPEN_DELAY_MS - 1);
    rail.pointerMoved('mouse');
    vi.advanceTimersByTime(RAIL_OPEN_DELAY_MS - 1);
    expect(rail.open).toBe(false);

    vi.advanceTimersByTime(1);
    expect(rail.open).toBe(true);
  });

  it('does not open when the pointer only crosses the rail', () => {
    const rail = new RailState();

    rail.pointerMoved('mouse');
    rail.pointerLeft('mouse');
    vi.advanceTimersByTime(RAIL_OPEN_DELAY_MS + RAIL_CLOSE_DELAY_MS);

    expect(rail.open).toBe(false);
  });

  it('closes after the pointer leaves, and stays open if it comes back in time', () => {
    const rail = new RailState();
    stopped(rail);

    rail.pointerLeft('mouse');
    vi.advanceTimersByTime(RAIL_CLOSE_DELAY_MS - 1);
    rail.pointerMoved('mouse');
    vi.advanceTimersByTime(RAIL_CLOSE_DELAY_MS);
    expect(rail.open).toBe(true);

    rail.pointerLeft('mouse');
    vi.advanceTimersByTime(RAIL_CLOSE_DELAY_MS);
    expect(rail.open).toBe(false);
  });

  it('closes on a choice, and opens again only after the pointer leaves and comes back', () => {
    const rail = new RailState();
    stopped(rail);

    rail.selected();
    expect(rail.open).toBe(false);

    stopped(rail);
    expect(rail.open).toBe(false);

    rail.pointerLeft('mouse');
    stopped(rail);
    expect(rail.open).toBe(true);
  });

  it('stays open while something holds it, and closes after that', () => {
    let held = true;
    const rail = new RailState(() => held);
    stopped(rail);

    rail.pointerLeft('mouse');
    vi.advanceTimersByTime(RAIL_CLOSE_DELAY_MS * 3);
    expect(rail.open).toBe(true);

    held = false;
    vi.advanceTimersByTime(RAIL_CLOSE_DELAY_MS);
    expect(rail.open).toBe(false);
  });

  it('opens at once on keyboard focus, and closes when the focus leaves', () => {
    const rail = new RailState();

    rail.focusEntered();
    expect(rail.open).toBe(true);

    rail.focusLeft();
    vi.advanceTimersByTime(RAIL_CLOSE_DELAY_MS);
    expect(rail.open).toBe(false);
  });

  it('keeps the rail that the pointer opened when focus leaves it', () => {
    const rail = new RailState();
    stopped(rail);

    rail.focusEntered();
    rail.focusLeft();
    vi.advanceTimersByTime(RAIL_CLOSE_DELAY_MS);

    expect(rail.open).toBe(true);
  });

  it('ignores a touch on the rail: the logo opens it', () => {
    const rail = new RailState();

    rail.pointerMoved('touch');
    vi.advanceTimersByTime(RAIL_OPEN_DELAY_MS);
    expect(rail.open).toBe(false);

    rail.tapped();
    expect(rail.open).toBe(true);

    rail.pointerLeft('touch');
    vi.advanceTimersByTime(RAIL_CLOSE_DELAY_MS);
    expect(rail.open).toBe(true);

    rail.tapped();
    expect(rail.open).toBe(false);
  });

  it('runs no timer after it is destroyed', () => {
    const rail = new RailState();

    rail.pointerMoved('mouse');
    rail.destroy();
    vi.advanceTimersByTime(RAIL_OPEN_DELAY_MS);

    expect(rail.open).toBe(false);
  });
});
