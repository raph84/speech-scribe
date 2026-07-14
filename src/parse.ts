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

  results.forEach((result, resultIndex) => {
    if (typeof result !== "object" || result === null || Array.isArray(result)) {
      throw new Error(
        `results[${resultIndex}] is not an object — not a valid v2 SpeechRecognitionResult`,
      );
    }

    if ("result" in result && !("alternatives" in result)) {
      throw new Error(
        "This looks like a BatchRecognize GCS transcript envelope, which is not yet supported",
      );
    }

    const { alternatives } = result as { alternatives?: unknown };
    if (!Array.isArray(alternatives)) {
      return;
    }

    alternatives.forEach((alternative, altIndex) => {
      if (typeof alternative !== "object" || alternative === null) {
        return;
      }

      const { words } = alternative as { words?: unknown };
      if (!Array.isArray(words)) {
        return;
      }

      words.forEach((word, wordIndex) => {
        if (
          typeof word !== "object" ||
          word === null ||
          typeof (word as { word?: unknown }).word !== "string"
        ) {
          throw new Error(
            `results[${resultIndex}].alternatives[${altIndex}].words[${wordIndex}] is missing a string 'word' field`,
          );
        }
      });
    });
  });

  return json as RecognizeResponse;
}
