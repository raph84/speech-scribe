import { parseDuration } from "./duration.js";
import type { RecognizeResponse, WordInfo } from "./types.js";

export interface Turn {
  /** Raw speakerLabel (or the unknown-speaker sentinel if absent). */
  speaker: string;
  text: string;
  /** Omitted when the source word's startOffset was missing. */
  startTime?: number;
  /** Omitted when the source word's endOffset was missing. */
  endTime?: number;
}

export interface GroupOptions {
  /**
   * Max gap in seconds between consecutive words of the same speaker before
   * starting a new turn anyway. Default: Infinity — same-speaker words are
   * never split on a pause alone.
   */
  maxGapSeconds?: number;
  /** Label used when a word has no speakerLabel (diarization not enabled). */
  unknownSpeakerLabel?: string;
}

interface FlatWord {
  speaker: string;
  word: string;
  startTime: number | undefined;
  endTime: number | undefined;
}

function flattenWords(response: RecognizeResponse, unknownSpeakerLabel: string): FlatWord[] {
  const flat: FlatWord[] = [];

  for (const result of response.results ?? []) {
    const alternative = result.alternatives?.[0];
    if (!alternative) {
      continue;
    }

    for (const word of alternative.words ?? ([] as WordInfo[])) {
      flat.push({
        speaker: word.speakerLabel ?? unknownSpeakerLabel,
        word: word.word,
        startTime: parseDuration(word.startOffset),
        endTime: parseDuration(word.endOffset),
      });
    }
  }

  return flat;
}

/**
 * Groups consecutive words sharing the same speaker label into turns, in
 * conversation order. Result boundaries are not inherently turn boundaries —
 * a turn can legitimately span multiple SpeechRecognitionResults.
 */
export function groupWordsIntoTurns(
  response: RecognizeResponse,
  options: GroupOptions = {},
): Turn[] {
  const unknownSpeakerLabel = options.unknownSpeakerLabel ?? "unknown";
  const maxGapSeconds = options.maxGapSeconds ?? Infinity;

  const words = flattenWords(response, unknownSpeakerLabel);
  const turns: Turn[] = [];

  let current: {
    speaker: string;
    words: string[];
    startTime: number | undefined;
    endTime: number | undefined;
  } | null = null;

  const flushCurrentTurn = () => {
    if (current !== null) {
      turns.push({
        speaker: current.speaker,
        text: current.words.join(" "),
        startTime: current.startTime,
        endTime: current.endTime,
      });
    }
  };

  for (const word of words) {
    const startsNewTurn =
      current === null ||
      word.speaker !== current.speaker ||
      (word.startTime !== undefined &&
        current.endTime !== undefined &&
        word.startTime - current.endTime > maxGapSeconds);

    if (startsNewTurn) {
      flushCurrentTurn();
      current = {
        speaker: word.speaker,
        words: [word.word],
        startTime: word.startTime,
        endTime: word.endTime,
      };
    } else {
      current!.words.push(word.word);
      current!.endTime = word.endTime;
    }
  }

  flushCurrentTurn();

  return turns;
}
