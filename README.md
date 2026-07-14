# speech-scribe

Parse JSON transcripts produced by [Google Cloud Speech-to-Text v2](https://speech.googleapis.com/$discovery/rest?version=v2) and reassemble the word-level speaker-diarization output into per-speaker conversational turns, in chronological order.

Given a v2 `Recognize`/`BatchRecognize` response — where each word carries a `speakerLabel` and a `startOffset`/`endOffset` — speech-scribe groups consecutive words from the same speaker into turns like:

```json
{ "speaker": "1", "text": "Hello there", "startTime": 0, "endTime": 1 }
```

and can render those turns as Markdown or JSON.

## Install

```bash
pnpm install
pnpm build
```

Requires Node ≥24.

## CLI usage

```
speech-scribe [--max-gap-seconds=<n>] [--json|--markdown]
```

- `--json` — write the turns as `{ "turns": Turn[] }` (default; explicit flag is optional).
- `--markdown` — write the turns as Markdown. Default is JSON.
- `--max-gap-seconds=<n>` — also start a new turn if the pause between two consecutive words from the same speaker exceeds `n` seconds. Default: never split on a pause alone.

Input is read from stdin; output is written to stdout. Redirect to/from files as needed.

Examples:

```bash
node dist/cli.js < transcript.json > turns.json
node dist/cli.js --markdown < transcript.json > turns.md
node dist/cli.js --max-gap-seconds=5 < transcript.json > turns.json

cat transcript.json | node dist/cli.js | jq .
```

Markdown output looks like:

```markdown
- **Speaker 1:** Hello there, how are you?
- **Speaker 2:** I'm doing well, thanks for asking.
```

## Library usage

```ts
import { parseRecognizeResponse, groupWordsIntoTurns, formatTurnsAsMarkdown } from "speech-scribe";

const response = parseRecognizeResponse(JSON.parse(rawGcpJson));
const turns = groupWordsIntoTurns(response); // Turn[] — plain, JSON-serializable

const markdown = formatTurnsAsMarkdown(turns);
```

### API

- `parseRecognizeResponse(json: unknown): RecognizeResponse` — validates untyped JSON into a v2 response shape. Throws a descriptive error if `results` is missing, or if the input looks like a BatchRecognize GCS transcript envelope (not yet supported).
- `groupWordsIntoTurns(response: RecognizeResponse, options?: GroupOptions): Turn[]` — flattens all words across `results` in order and groups consecutive same-speaker words into turns. A turn can span multiple `results`; result boundaries are not turn boundaries.
  - `options.maxGapSeconds` — start a new turn if the gap since the previous word exceeds this many seconds, even for the same speaker. Default: `Infinity` (never split on a pause alone).
  - `options.unknownSpeakerLabel` — label used for words with no `speakerLabel` (diarization disabled). Default: `"unknown"`.
- `formatTurnsAsMarkdown(turns: Turn[], options?: FormatOptions): string` — renders one turn per line: `` - **Speaker 1:** text ``.
  - `options.speakerLabelToDisplayName` — override how a raw `speaker` label (e.g. `"1"`, `"unknown"`) is displayed. Default: `"1"` → `Speaker 1`, `"unknown"` → `Unknown Speaker`.
- `parseDuration(value: DurationLike | undefined): number | undefined` — converts a protobuf `Duration` (`"1.200s"` string or `{ seconds, nanos }` object) to seconds; returns `undefined` if the offset is missing.

### Types

```ts
interface Turn {
  speaker: string;    // raw speakerLabel, or "unknown" if diarization wasn't enabled
  text: string;
  startTime?: number; // seconds; omitted if the source word had no startOffset
  endTime?: number;   // seconds; omitted if the source word had no endOffset
}
```

See `src/types.ts` for the full v2 schema subset (`WordInfo`, `SpeechRecognitionResult`, `RecognizeResponse`, etc.).

## Notes and limitations

- Only the v2 API schema is supported (`speakerLabel`, not v1's integer `speakerTag`).
- No sentence-boundary splitting is attempted — a turn is exactly one contiguous run of same-speaker words, joined with spaces.
- The BatchRecognize GCS transcript-file envelope is detected and rejected with a clear error rather than silently mis-parsed; only the plain `{ results: [...] }` response shape is currently supported.

For contributing/development setup, see [DEVELOPMENT.md](./DEVELOPMENT.md).
