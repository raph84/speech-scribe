# Development

## Requirements

- Node ≥24
- pnpm (`packageManager` is pinned in `package.json`; run via `corepack enable` or install the pinned version directly)

## Setup

```bash
pnpm install
```

## Scripts

| Command             | Description                                      |
| -------------------- | ------------------------------------------------- |
| `pnpm typecheck`     | Type-check with `tsc --noEmit`, no output emitted |
| `pnpm test`          | Run the vitest suite once                          |
| `pnpm test:watch`    | Run vitest in watch mode                           |
| `pnpm build`         | Compile `src/` to `dist/` (declarations included)  |

Run typecheck and tests before opening a PR:

```bash
pnpm typecheck && pnpm test
```

## Project layout

```
src/
  types.ts     # v2 discovery schema subset (WordInfo, SpeechRecognitionResult, RecognizeResponse, ...)
  duration.ts  # parseDuration(): protobuf Duration ("1.200s" string or {seconds,nanos} object) -> seconds
  parse.ts     # parseRecognizeResponse(): runtime validation of untyped JSON into RecognizeResponse
  group.ts     # groupWordsIntoTurns(): the core word -> Turn[] grouping algorithm
  format.ts    # formatTurnsAsMarkdown(): Turn[] -> markdown string
  cli.ts       # run(argv): CLI entry point (reads input JSON, writes Markdown or JSON output)
  index.ts     # public library exports
test/
  fixtures/    # hand-authored v2-schema JSON fixtures (no real GCP sample is committed)
  *.test.ts    # vitest suites, one per src module
```

There are no runtime dependencies — parsing and validation are hand-rolled against the documented v2 schema rather than using a generated GCP client, since only a small read-only subset of the schema is needed.

## Testing

Tests use [vitest](https://vitest.dev/). Fixtures under `test/fixtures/` are hand-authored (no real Speech-to-Text output is available in this repo), so if you encounter a real-world JSON shape that doesn't parse correctly, add a fixture reproducing the shape (redact any sensitive audio/transcript content) and a corresponding test case rather than only fixing the code path.

Run a single file or pattern:

```bash
pnpm exec vitest run test/group.test.ts
```

## Manual CLI verification

After `pnpm build`:

```bash
node dist/cli.js test/fixtures/two-speakers.json /tmp/out.md
cat /tmp/out.md

node dist/cli.js test/fixtures/two-speakers.json /tmp/out.json --json
cat /tmp/out.json
```

## Conventions

- ESM throughout (`"type": "module"`, `NodeNext` module resolution) — relative imports in `src/` use explicit `.js` extensions even though the source files are `.ts`.
- `parseRecognizeResponse` is the trust boundary: everything past it operates on typed `RecognizeResponse` data. Keep new input-validation logic there rather than scattering `unknown`-handling deeper in the pipeline.
- The CLI's `run(argv)` never calls `process.exit()` directly — it sets `process.exitCode` so it stays callable/testable without killing the test process.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>[optional scope]: <description>`, e.g. `feat(cli): add --max-gap-seconds flag` or `fix: handle missing speakerLabel on words`. Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`. Add a scope only when it clarifies which area changed; omit it otherwise.
