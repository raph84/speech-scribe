import type { Turn } from "./group.js";

export interface FormatOptions {
  /** Maps a raw speakerLabel (or "unknown") to display text. */
  speakerLabelToDisplayName?: (label: string) => string;
}

function defaultSpeakerLabelToDisplayName(label: string): string {
  if (/^\d+$/.test(label)) {
    return `Speaker ${label}`;
  }
  if (label === "unknown") {
    return "Unknown Speaker";
  }
  return label;
}

/** Renders turns as a Markdown file, one speaker turn per line. */
export function formatTurnsAsMarkdown(turns: Turn[], options: FormatOptions = {}): string {
  const toDisplayName = options.speakerLabelToDisplayName ?? defaultSpeakerLabelToDisplayName;

  return turns
    .map((turn) => `- **${toDisplayName(turn.speaker)}:** ${turn.text}`)
    .join("\n");
}
