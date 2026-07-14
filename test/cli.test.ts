import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/cli.js";

const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url).pathname;

/** Replaces process.stdin with a fake stream that yields the given text, for the duration of the test. */
function stubStdin(text: string): void {
  const stdin = Readable.from([Buffer.from(text, "utf-8")]);
  Object.defineProperty(process, "stdin", { value: stdin, configurable: true });
}

async function stubStdinFromFixture(name: string): Promise<void> {
  stubStdin(await readFile(fixture(name), "utf-8"));
}

describe("cli run()", () => {
  const originalStdin = process.stdin;

  afterEach(() => {
    Object.defineProperty(process, "stdin", { value: originalStdin, configurable: true });
    vi.restoreAllMocks();
  });

  it("writes JSON to stdout by default", async () => {
    await stubStdinFromFixture("two-speakers.json");
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    await run([]);

    expect(process.exitCode).not.toBe(1);
    expect(writeSpy).toHaveBeenCalledTimes(1);
    const { turns } = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(turns).toEqual([
      { speaker: "1", text: "Hello there", startTime: 0, endTime: 1 },
      { speaker: "2", text: "Hi how are", startTime: 1.2, endTime: 2.3 },
      { speaker: "1", text: "you there", startTime: 2.3, endTime: 3 },
    ]);
  });

  it("writes Markdown when --markdown is passed explicitly", async () => {
    await stubStdinFromFixture("two-speakers.json");
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    await run(["--markdown"]);

    expect(process.exitCode).not.toBe(1);
    const markdown = writeSpy.mock.calls[0][0] as string;
    expect(markdown).toContain("- **Speaker 1:** Hello there");
  });

  it("writes turns as JSON when --json is passed", async () => {
    await stubStdinFromFixture("two-speakers.json");
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    await run(["--json"]);

    expect(process.exitCode).not.toBe(1);
    const { turns } = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(turns).toEqual([
      { speaker: "1", text: "Hello there", startTime: 0, endTime: 1 },
      { speaker: "2", text: "Hi how are", startTime: 1.2, endTime: 2.3 },
      { speaker: "1", text: "you there", startTime: 2.3, endTime: 3 },
    ]);
  });

  it("sets exitCode=1 and does not throw when both --json and --markdown are passed", async () => {
    process.exitCode = undefined;
    await stubStdinFromFixture("two-speakers.json");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(run(["--json", "--markdown"])).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("at most one of --json or --markdown"));
    process.exitCode = undefined;
  });

  it("sets exitCode=1 and does not throw when a positional argument is given", async () => {
    process.exitCode = undefined;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(run(["input.json"])).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    process.exitCode = undefined;
  });

  it("sets exitCode=1 and does not throw when --max-gap-seconds is given an empty value", async () => {
    process.exitCode = undefined;
    await stubStdinFromFixture("two-speakers.json");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(run(["--max-gap-seconds="])).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid --max-gap-seconds value"));
    process.exitCode = undefined;
  });

  it("sets exitCode=1 and does not throw on malformed JSON input", async () => {
    process.exitCode = undefined;
    await stubStdinFromFixture("malformed.json");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(run([])).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    process.exitCode = undefined;
  });
});
