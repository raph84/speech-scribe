# CLAUDE.md

This file provides guidance to AI Agents when working with code in this repository.

## What this is

speech-scribe parses JSON transcripts from Google Cloud Speech-to-Text v2 (`Recognize`/`BatchRecognize` responses, where each word carries a `speakerLabel` and `startOffset`/`endOffset`) and reassembles the word-level diarization output into per-speaker conversational turns, in chronological order. It ships as both a library and a CLI (`speech-scribe`, reads JSON from stdin, writes Markdown or JSON to stdout).

Only the v2 API schema is supported (`speakerLabel`, not v1's integer `speakerTag`). The BatchRecognize GCS transcript-file envelope shape is detected and rejected with a clear error rather than silently mis-parsed — only the plain `{ results: [...] }` response shape is currently handled.

There are no runtime dependencies — parsing/validation is hand-rolled against the documented v2 schema rather than using a generated GCP client, since only a small read-only subset of the schema is needed.

## Commands

```bash
pnpm install                          # setup (Node >=24, pnpm pinned via packageManager)
pnpm typecheck                        # tsc --noEmit
pnpm test                             # run vitest suite once
pnpm test:watch                       # vitest watch mode
pnpm exec vitest run test/group.test.ts   # run a single test file
pnpm build                            # compile src/ -> dist/ (with .d.ts)
```

Run typecheck and tests before opening a PR: `pnpm typecheck && pnpm test`.

Manual CLI verification (after `pnpm build`) — CLI reads stdin, writes stdout only:

```bash
node dist/cli.js < test/fixtures/two-speakers.json > /tmp/out.json
node dist/cli.js --markdown < test/fixtures/two-speakers.json > /tmp/out.md
```

## Architecture

Pipeline: `parseRecognizeResponse` (untyped JSON -> typed `RecognizeResponse`) -> `groupWordsIntoTurns` (flatten all words across `results` in order, group consecutive same-speaker words) -> `formatTurnsAsMarkdown` (optional, for Markdown output).

- `src/types.ts` — minimal subset of the v2 discovery schema (`WordInfo`, `SpeechRecognitionResult`, `RecognizeResponse`, `DurationLike`).
- `src/duration.ts` — `parseDuration()`: converts a protobuf `Duration` (`"1.200s"` string or `{seconds, nanos}` object) to seconds.
- `src/parse.ts` — `parseRecognizeResponse()`: **the trust boundary**. Everything downstream operates on typed `RecognizeResponse` data; keep new input-validation logic here rather than scattering `unknown`-handling deeper in the pipeline.
- `src/group.ts` — `groupWordsIntoTurns()`: the core word -> `Turn[]` grouping algorithm. Flattens words across all `results` (a turn can span multiple `SpeechRecognitionResult`s — result boundaries are not turn boundaries) and splits into a new turn when the speaker changes, or optionally when the gap since the previous word exceeds `maxGapSeconds` (default: never split on a pause alone). No sentence-boundary splitting is attempted.
- `src/format.ts` — `formatTurnsAsMarkdown()`: renders one turn per line (`- **Speaker 1:** text`).
- `src/cli.ts` — `run(argv)`: CLI entry point. Reads stdin, writes stdout. Never calls `process.exit()` directly — sets `process.exitCode` so it stays callable/testable without killing the test process.
- `src/index.ts` — public library exports.

## Conventions

- ESM throughout (`"type": "module"`, `NodeNext` module resolution) — relative imports in `src/` use explicit `.js` extensions even though the source files are `.ts`.
- Tests live in `test/*.test.ts`, one suite per `src` module, using vitest.
- `test/fixtures/` contains hand-authored v2-schema JSON fixtures (no real GCP sample is committed, so nothing sensitive lands in the repo). If you encounter a real-world JSON shape that doesn't parse correctly, add a fixture reproducing the shape (redact any sensitive audio/transcript content) and a corresponding test case rather than only fixing the code path.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>[optional scope]: <description>`, e.g. `feat(cli): add --max-gap-seconds flag` or `fix: handle missing speakerLabel on words`. Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`. Add a scope only when it clarifies which area changed; omit it otherwise.
