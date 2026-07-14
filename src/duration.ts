import type { DurationLike } from "./types.js";

const DURATION_STRING_PATTERN = /^-?\d+(\.\d+)?s$/;

/**
 * Converts a protobuf.Duration (string "1.200s" or { seconds, nanos } object
 * form) into a number of seconds. Returns undefined when the offset itself is
 * missing, rather than a value like 0 that could be mistaken for real data.
 */
export function parseDuration(value: DurationLike | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    if (!DURATION_STRING_PATTERN.test(value)) {
      throw new TypeError(`Invalid Duration string: ${JSON.stringify(value)}`);
    }
    return parseFloat(value.slice(0, -1));
  }

  if (typeof value === "object" && value !== null) {
    const seconds = value.seconds === undefined ? 0 : Number(value.seconds);
    const nanos = value.nanos === undefined ? 0 : value.nanos;
    if (!Number.isFinite(seconds) || !Number.isFinite(nanos)) {
      throw new TypeError(`Invalid Duration object: ${JSON.stringify(value)}`);
    }
    return seconds + nanos / 1e9;
  }

  throw new TypeError(`Invalid Duration value: ${JSON.stringify(value)}`);
}
