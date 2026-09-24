const { computeLifecycleStatus } = require('../src/services/competitionService');

// These tests exercise the pure status-derivation logic directly, with no
// database dependency, so they can run in any environment (including
// sandboxes without network access to download a MongoDB binary).

const DAY = 24 * 60 * 60 * 1000;

function comp(overrides) {
  const now = Date.now();
  return {
    startAt: new Date(now + 2 * DAY),
    endAt: new Date(now + 5 * DAY),
    totalSpots: 10,
    registeredCount: 0,
    ...overrides,
  };
}

describe('computeLifecycleStatus (pure logic)', () => {
  it('returns UPCOMING before startAt with room remaining', () => {
    expect(computeLifecycleStatus(comp({}))).toBe('UPCOMING');
  });

  it('returns LIVE between startAt and endAt', () => {
    const now = Date.now();
    const c = comp({ startAt: new Date(now - DAY), endAt: new Date(now + DAY) });
    expect(computeLifecycleStatus(c)).toBe('LIVE');
  });

  it('returns ENDED after endAt', () => {
    const now = Date.now();
    const c = comp({ startAt: new Date(now - 5 * DAY), endAt: new Date(now - DAY) });
    expect(computeLifecycleStatus(c)).toBe('ENDED');
  });

  it('returns FULL when registeredCount reaches totalSpots before startAt', () => {
    const c = comp({ totalSpots: 5, registeredCount: 5 });
    expect(computeLifecycleStatus(c)).toBe('FULL');
  });

  it('prioritizes ENDED over FULL once the competition has ended', () => {
    const now = Date.now();
    const c = comp({
      startAt: new Date(now - 5 * DAY),
      endAt: new Date(now - DAY),
      totalSpots: 5,
      registeredCount: 5,
    });
    expect(computeLifecycleStatus(c)).toBe('ENDED');
  });

  it('is computed from an explicit "now" so tests are deterministic', () => {
    const start = new Date('2026-01-10T00:00:00Z');
    const end = new Date('2026-01-20T00:00:00Z');
    const c = { startAt: start, endAt: end, totalSpots: 10, registeredCount: 0 };

    expect(computeLifecycleStatus(c, new Date('2026-01-05T00:00:00Z'))).toBe('UPCOMING');
    expect(computeLifecycleStatus(c, new Date('2026-01-15T00:00:00Z'))).toBe('LIVE');
    expect(computeLifecycleStatus(c, new Date('2026-01-25T00:00:00Z'))).toBe('ENDED');
  });
});
