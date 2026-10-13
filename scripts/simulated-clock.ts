/**
 * Dev-only: run `fn` while this process's clock reads `when`.
 *
 * broadsheet sets writing dates itself (`new Date()` inside createWriting) and
 * exposes no way to choose them. The seed script needs a believable spread of
 * dates, so instead of adding a date-setting API it simulates time passing, the
 * same thing a test's fake timers do. Only the seed process is affected; the
 * app and the database rules are untouched.
 */
export function atSimulatedTime<T>(when: Date, fn: () => T): T {
  const RealDate = Date;
  const frozen = when.getTime();

  class SimulatedDate extends RealDate {
    constructor(...args: unknown[]) {
      super(...((args.length > 0 ? args : [frozen]) as [number]));
    }
    static now(): number {
      return frozen;
    }
  }

  globalThis.Date = SimulatedDate as DateConstructor;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}
