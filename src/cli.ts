import { realpathSync } from "node:fs";
import { text } from "node:stream/consumers";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { formatTurnsAsMarkdown } from "./format.js";
import { groupWordsIntoTurns } from "./group.js";
import { parseRecognizeResponse } from "./parse.js";

const USAGE =
  "Usage: speech-scribe [--max-gap-seconds=<n>] [--json|--markdown]\n" +
  "  Reads input JSON from stdin; output is written to stdout.";

type OutputFormat = "json" | "markdown";

function parseCliArgs(argv: string[]): {
  maxGapSeconds?: number;
  format: OutputFormat;
} {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      "max-gap-seconds": { type: "string" },
      json: { type: "boolean" },
      markdown: { type: "boolean" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (positionals.length > 0) {
    throw new Error(USAGE);
  }

  const maxGapValue = values["max-gap-seconds"];
  let maxGapSeconds: number | undefined;

  if (maxGapValue !== undefined) {
    const raw = String(maxGapValue);
    maxGapSeconds = raw === "" ? NaN : Number(raw);

    if (Number.isNaN(maxGapSeconds)) {
      throw new Error(`Invalid --max-gap-seconds value: --max-gap-seconds=${raw}`);
    }
  }

  const wantsJson = Boolean(values.json);
  const wantsMarkdown = Boolean(values.markdown);

  if (wantsJson && wantsMarkdown) {
    throw new Error("Specify at most one of --json or --markdown");
  }

  const format: OutputFormat = wantsMarkdown ? "markdown" : "json";

  return { maxGapSeconds, format };
}

async function readStdin(): Promise<string> {
  return text(process.stdin);
}

/** Testable CLI core: reads the input JSON from stdin, writes Markdown or JSON turns to stdout. */
export async function run(argv: string[]): Promise<void> {
  try {
    const { maxGapSeconds, format } = parseCliArgs(argv);

    let raw: string;
    try {
      raw = await readStdin();
    } catch (error) {
      throw new Error(`Could not read input from stdin: ${(error as Error).message}`);
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Invalid JSON in stdin: ${(error as Error).message}`);
    }

    const response = parseRecognizeResponse(json);
    const turns = groupWordsIntoTurns(response, { maxGapSeconds });
    const output =
      format === "json" ? JSON.stringify({ turns }, null, 2) : formatTurnsAsMarkdown(turns);

    process.stdout.write(output);
    console.error(`Wrote ${turns.length} turn(s) to stdout`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

const isMainModule =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  void run(process.argv.slice(2));
}
