/**
 * Minimal subset of the Google Cloud Speech-to-Text v2 discovery schema
 * (https://speech.googleapis.com/$discovery/rest?version=v2) needed to
 * reassemble diarized words into per-speaker turns.
 */

/**
 * A protobuf.Duration as it appears in v2 JSON responses. Usually a string
 * like "1.200s", but can also be serialized as a { seconds, nanos } object.
 */
export type DurationLike = string | { seconds?: string | number; nanos?: number };

export interface WordInfo {
  startOffset?: DurationLike;
  endOffset?: DurationLike;
  word: string;
  confidence?: number;
  /** Diarized speaker label (e.g. "1", "2"). Absent if diarization wasn't requested. */
  speakerLabel?: string;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence?: number;
  words?: WordInfo[];
}

export interface SpeechRecognitionResult {
  alternatives: SpeechRecognitionAlternative[];
  channelTag?: number;
  resultEndOffset?: DurationLike;
  languageCode?: string;
}

/** Response shape for Recognize / aggregated inline BatchRecognize results. */
export interface RecognizeResponse {
  results: SpeechRecognitionResult[];
}
