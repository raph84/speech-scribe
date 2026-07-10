import { readFile, writeFile } from "node:fs/promises";
import { formatTurnsAsMarkdown } from "./format.js";
import { groupWordsIntoTurns } from "./group.js";
import { parseRecognizeResponse } from "./parse.js";

const USAGE =
  "Usage: speech-scribe <inputFile.json> <outputFile> [--max-gap-seconds=<n>] [--json|--markdown]";

type OutputFormat = "json" | "markdown";

function parseArgs(argv: string[]): {
  inputPath: string;
  outputPath: string;
  maxGapSeconds?: number;
  format: OutputFormat;
} {
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  const [inputPath, outputPath] = positional;

  if (!inputPath || !outputPath) {
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

  const format: OutputFormat = wantsJson ? "json" : "markdown";

  return { inputPath, outputPath, maxGapSeconds, format };
}

/** Testable CLI core: reads the input JSON, writes the output file as Markdown or JSON turns. */
export async function run(argv: string[]): Promise<void> {
  try {
    const { inputPath, outputPath, maxGapSeconds, format } = parseArgs(argv);

    let raw: string;
    try {
      raw = await readFile(inputPath, "utf-8");
    } catch (error) {
      throw new Error(`Could not read input file '${inputPath}': ${(error as Error).message}`);
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Invalid JSON in '${inputPath}': ${(error as Error).message}`);
    }

    const response = parseRecognizeResponse(json);
    const turns = groupWordsIntoTurns(response, { maxGapSeconds });
    const output = format === "json" ? JSON.stringify(turns, null, 2) : formatTurnsAsMarkdown(turns);

    await writeFile(outputPath, output, "utf-8");
    console.log(`Wrote ${turns.length} turn(s) to ${outputPath}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void run(process.argv.slice(2));
}
