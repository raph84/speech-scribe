import { describe, expect, it } from "vitest";
import { parseRecognizeResponse } from "../src/parse.js";

describe("parseRecognizeResponse", () => {
  it("passes through a valid response", () => {
    const json = { results: [{ alternatives: [{ transcript: "hi", words: [] }] }] };
    expect(parseRecognizeResponse(json)).toEqual(json);
  });

  it("throws when 'results' is missing", () => {
    expect(() => parseRecognizeResponse({})).toThrow(/Missing 'results' array/);
  });

  it("throws when given a non-object", () => {
    expect(() => parseRecognizeResponse("not an object")).toThrow();
  });

  it("throws a distinct error for the BatchRecognize GCS transcript envelope", () => {
    const batchEnvelope = { results: [{ result: { alternatives: [] } }] };
    expect(() => parseRecognizeResponse(batchEnvelope)).toThrow(/not yet supported/);
  });
});
