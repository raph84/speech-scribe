import type { RecognizeResponse } from "./types.js";

/**
 * Validates untyped JSON into a v2 RecognizeResponse. Throws a descriptive
 * error rather than silently mis-parsing, since diarization output that
 * doesn't match the expected shape would otherwise fail confusingly deep
 * inside the grouping logic.
 */
export function parseRecognizeResponse(json: unknown): RecognizeResponse {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("Expected a JSON object with a 'results' array");
  }

  const { results } = json as { results?: unknown };

  if (!Array.isArray(results)) {
    throw new Error(
      "Missing 'results' array — not a valid v2 SpeechRecognitionResponse",
    );
  }

  const first = results[0];
  if (
    first !== undefined &&
    typeof first === "object" &&
    first !== null &&
    "result" in first &&
    !("alternatives" in first)
  ) {
    throw new Error(
      "This looks like a BatchRecognize GCS transcript envelope, which is not yet supported",
    );
  }

  return json as RecognizeResponse;
}
