import { describe, expect, it } from "vitest";
import { formatTurnsAsMarkdown } from "../src/format.js";
import type { Turn } from "../src/group.js";

describe("formatTurnsAsMarkdown", () => {
  const turns: Turn[] = [
    { speaker: "1", text: "Hello there, how are you?", startTime: 0, endTime: 1.5 },
    { speaker: "2", text: "I'm doing well, thanks.", startTime: 1.5, endTime: 3 },
    { speaker: "unknown", text: "Someone off mic.", startTime: 3, endTime: 4 },
  ];

  it("renders one turn per line with default speaker labels", () => {
    expect(formatTurnsAsMarkdown(turns)).toBe(
      [
        "- **Speaker 1:** Hello there, how are you?",
        "- **Speaker 2:** I'm doing well, thanks.",
        "- **Unknown Speaker:** Someone off mic.",
      ].join("\n"),
    );
  });

  it("returns an empty string for no turns", () => {
    expect(formatTurnsAsMarkdown([])).toBe("");
  });

  it("supports a custom speaker label mapping", () => {
    const markdown = formatTurnsAsMarkdown(turns, {
      speakerLabelToDisplayName: (label) => `Agent-${label}`,
    });
    expect(markdown).toContain("- **Agent-1:** Hello there, how are you?");
    expect(markdown).toContain("- **Agent-unknown:** Someone off mic.");
  });
});
