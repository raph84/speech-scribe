import { describe, expect, it } from "vitest";
import { parseRecognizeResponse } from "../src/parse.js";

describe("parseRecognizeResponse", () => {
  it("passes through a valid response", () => {
    const json = { results: [{ alternatives: [{ transcript: "hi", words: [] }] }] };
    expect(parseRecognizeResponse(json)).toEqual(json);
  });

  it("accepts a result with an empty 'alternatives' array", () => {
    const json = { results: [{ alternatives: [] }] };
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

  it("throws a distinct error for a BatchRecognize-shaped entry not in position 0", () => {
    const mixedEnvelope = {
      results: [
        { alternatives: [{ transcript: "hi", words: [] }] },
        { result: { alternatives: [] } },
      ],
    };
    expect(() => parseRecognizeResponse(mixedEnvelope)).toThrow(/not yet supported/);
  });

  it("throws a descriptive error for a null entry in 'results'", () => {
    expect(() => parseRecognizeResponse({ results: [null] })).toThrow(
      /results\[0\] is not an object/,
    );
  });

  it("throws a descriptive error for a non-object entry in 'results'", () => {
    expect(() => parseRecognizeResponse({ results: ["not an object"] })).toThrow(
      /results\[0\] is not an object/,
    );
  });

  it("throws a descriptive error when a word is missing the 'word' field", () => {
    const json = {
      results: [
        {
          alternatives: [
            {
              transcript: "hi there",
              words: [{ startOffset: "0s", endOffset: "1s", speakerLabel: "1" }],
            },
          ],
        },
      ],
    };
    expect(() => parseRecognizeResponse(json)).toThrow(
      /results\[0\]\.alternatives\[0\]\.words\[0\] is missing a string 'word' field/,
    );
  });
});
