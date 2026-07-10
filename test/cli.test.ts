import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/cli.js";

const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url).pathname;

describe("cli run()", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "speech-scribe-test-"));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("writes Markdown by default", async () => {
    const outputPath = join(workDir, "out.md");
    await run([fixture("two-speakers.json"), outputPath]);

    expect(process.exitCode).not.toBe(1);
    const markdown = await readFile(outputPath, "utf-8");
    expect(markdown).toContain("- **Speaker 1:** Hello there");
    expect(markdown).toContain("- **Speaker 2:** Hi how are");
  });

  it("writes Markdown when --markdown is passed explicitly", async () => {
    const outputPath = join(workDir, "out.md");
    await run([fixture("two-speakers.json"), outputPath, "--markdown"]);

    expect(process.exitCode).not.toBe(1);
    const markdown = await readFile(outputPath, "utf-8");
    expect(markdown).toContain("- **Speaker 1:** Hello there");
  });

  it("writes turns as JSON when --json is passed", async () => {
    const outputPath = join(workDir, "out.json");
    await run([fixture("two-speakers.json"), outputPath, "--json"]);

    expect(process.exitCode).not.toBe(1);
    const turns = JSON.parse(await readFile(outputPath, "utf-8"));
    expect(turns).toEqual([
      { speaker: "1", text: "Hello there", startTime: 0, endTime: 1 },
      { speaker: "2", text: "Hi how are", startTime: 1.2, endTime: 2.3 },
      { speaker: "1", text: "you there", startTime: 2.3, endTime: 3 },
    ]);
  });

  it("sets exitCode=1 and does not throw when both --json and --markdown are passed", async () => {
    process.exitCode = undefined;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const outputPath = join(workDir, "out.md");

    await expect(
      run([fixture("two-speakers.json"), outputPath, "--json", "--markdown"]),
    ).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("at most one of --json or --markdown"));
    process.exitCode = undefined;
  });

  it("sets exitCode=1 and does not throw when arguments are missing", async () => {
    process.exitCode = undefined;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(run([])).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    process.exitCode = undefined;
  });

  it("sets exitCode=1 and does not throw on malformed JSON input", async () => {
    process.exitCode = undefined;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const outputPath = join(workDir, "out.md");

    await expect(run([fixture("malformed.json"), outputPath])).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    process.exitCode = undefined;
  });
});
