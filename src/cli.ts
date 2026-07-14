import { formatTurnsAsMarkdown } from "./format.js";
import { groupWordsIntoTurns } from "./group.js";
import { parseRecognizeResponse } from "./parse.js";

const USAGE =
  "Usage: speech-scribe [--max-gap-seconds=<n>] [--json|--markdown]\n" +
  "  Reads input JSON from stdin; output is written to stdout.";

type OutputFormat = "json" | "markdown";

function parseArgs(argv: string[]): {
  maxGapSeconds?: number;
  format: OutputFormat;
} {
  const positional = argv.filter((arg) => !arg.startsWith("--"));

  if (positional.length > 0) {
    throw new Error(USAGE);
  }

  const maxGapFlag = argv.find((arg) => arg.startsWith("--max-gap-seconds="));
  const maxGapSeconds = maxGapFlag ? Number(maxGapFlag.split("=")[1]) : undefined;

  if (maxGapFlag && Number.isNaN(maxGapSeconds)) {
    throw new Error(`Invalid --max-gap-seconds value: ${maxGapFlag}`);
  }

  const wantsJson = argv.includes("--json");
  const wantsMarkdown = argv.includes("--markdown");

  if (wantsJson && wantsMarkdown) {
    throw new Error("Specify at most one of --json or --markdown");
  }

  const format: OutputFormat = wantsMarkdown ? "markdown" : "json";

  return { maxGapSeconds, format };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/** Testable CLI core: reads the input JSON from stdin, writes Markdown or JSON turns to stdout. */
export async function run(argv: string[]): Promise<void> {
  try {
    const { maxGapSeconds, format } = parseArgs(argv);

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
    const output = format === "json" ? JSON.stringify(turns, null, 2) : formatTurnsAsMarkdown(turns);

    process.stdout.write(output);
    console.error(`Wrote ${turns.length} turn(s) to stdout`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void run(process.argv.slice(2));
}
