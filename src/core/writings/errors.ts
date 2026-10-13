export class WritingNotFoundError extends Error {
  constructor(readonly writingId: number) {
    super(`Writing ${writingId} not found`);
    this.name = "WritingNotFoundError";
  }
}

export class InvalidCursorError extends Error {
  constructor(readonly cursor: string) {
    super(`Invalid feed cursor: ${cursor}`);
    this.name = "InvalidCursorError";
  }
}

/** Two adjacent writings are too close in feed position to fit one between them. */
export class OrderingPrecisionError extends Error {
  constructor() {
    super("No room left between neighbouring writings; feed positions need rebalancing");
    this.name = "OrderingPrecisionError";
  }
}
