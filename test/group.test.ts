import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { groupWordsIntoTurns } from "../src/group.js";
import { parseRecognizeResponse } from "../src/parse.js";
import type { RecognizeResponse } from "../src/types.js";

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf-8"));
}

describe("groupWordsIntoTurns", () => {
  it("groups consecutive same-speaker words into turns, in order, across result boundaries", () => {
    const response = parseRecognizeResponse(loadFixture("two-speakers.json"));
    const turns = groupWordsIntoTurns(response);

    expect(turns).toHaveLength(3);

    expect(turns[0].speaker).toBe("1");
    expect(turns[0].text).toBe("Hello there");
    expect(turns[0].startTime).toBeCloseTo(0);
    expect(turns[0].endTime).toBeCloseTo(1.0);

    expect(turns[1].speaker).toBe("2");
    expect(turns[1].text).toBe("Hi how are");
    expect(turns[1].startTime).toBeCloseTo(1.2);
    expect(turns[1].endTime).toBeCloseTo(2.3);

    expect(turns[2].speaker).toBe("1");
    expect(turns[2].text).toBe("you there");
    expect(turns[2].startTime).toBeCloseTo(2.3);
    expect(turns[2].endTime).toBeCloseTo(3.0);
  });

  it("does not merge non-adjacent turns from the same speaker", () => {
    const response = parseRecognizeResponse(loadFixture("two-speakers.json"));
    const turns = groupWordsIntoTurns(response);
    const speakerOneTurns = turns.filter((turn) => turn.speaker === "1");
    expect(speakerOneTurns).toHaveLength(2);
  });

  it("falls back to the unknown-speaker sentinel when speakerLabel is absent", () => {
    const response = parseRecognizeResponse(loadFixture("no-diarization.json"));
    const turns = groupWordsIntoTurns(response);

    expect(turns).toHaveLength(1);
    expect(turns[0].speaker).toBe("unknown");
    expect(turns[0].text).toBe("Hello there");
  });

  it("returns an empty array for empty results", () => {
    const response = parseRecognizeResponse(loadFixture("empty-results.json"));
    expect(groupWordsIntoTurns(response)).toEqual([]);
  });

  it("skips results with no alternatives without throwing", () => {
    const response: RecognizeResponse = { results: [{ alternatives: [] }] };
    expect(groupWordsIntoTurns(response)).toEqual([]);
  });

  it("splits a same-speaker turn when the gap exceeds maxGapSeconds", () => {
    const response: RecognizeResponse = {
      results: [
        {
          alternatives: [
            {
              transcript: "hello ... still there",
              words: [
                { word: "hello", startOffset: "0s", endOffset: "0.500s", speakerLabel: "1" },
                { word: "still", startOffset: "10s", endOffset: "10.500s", speakerLabel: "1" },
                { word: "there", startOffset: "10.500s", endOffset: "11s", speakerLabel: "1" },
              ],
            },
          ],
        },
      ],
    };

    const turns = groupWordsIntoTurns(response, { maxGapSeconds: 2 });
    expect(turns).toHaveLength(2);
    expect(turns[0].text).toBe("hello");
    expect(turns[1].text).toBe("still there");
  });

  it("omits startTime/endTime when the source word has no offsets, without inferring them", () => {
    const response: RecognizeResponse = {
      results: [
        {
          alternatives: [
            {
              transcript: "hello there",
              words: [
                { word: "hello", speakerLabel: "1" },
                { word: "there", endOffset: "1.500s", speakerLabel: "1" },
              ],
            },
          ],
        },
      ],
    };

    const turns = groupWordsIntoTurns(response);
    expect(turns).toHaveLength(1);
    expect(turns[0].startTime).toBeUndefined();
    expect(turns[0].endTime).toBeCloseTo(1.5);
    expect(JSON.stringify(turns[0])).not.toContain("startTime");
  });
});
