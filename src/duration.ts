import type { DurationLike } from "./types.js";

const DURATION_STRING_PATTERN = /^-?\d+(\.\d+)?s$/;

/**
 * Converts a protobuf.Duration (string "1.200s" or { seconds, nanos } object
 * form) into a number of seconds. Missing offsets default to 0 rather than
 * throwing, since callers still need a numeric startTime/endTime.
 */
export function parseDuration(value: DurationLike | undefined): number {
  if (value === undefined) {
    return 0;
  }

  if (typeof value === "string") {
    if (!DURATION_STRING_PATTERN.test(value)) {
      throw new TypeError(`Invalid Duration string: ${JSON.stringify(value)}`);
    }
    return parseFloat(value.slice(0, -1));
  }

  if (typeof value === "object" && value !== null) {
    const seconds = Number(value.seconds ?? 0);
    const nanos = value.nanos ?? 0;
    return seconds + nanos / 1e9;
  }

  throw new TypeError(`Invalid Duration value: ${JSON.stringify(value)}`);
}
