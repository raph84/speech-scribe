import { describe, expect, it } from "vitest";
import { parseDuration } from "../src/duration.js";

describe("parseDuration", () => {
  it("parses a decimal Duration string", () => {
    expect(parseDuration("1.200s")).toBeCloseTo(1.2);
  });

  it("parses a zero Duration string", () => {
    expect(parseDuration("0s")).toBe(0);
  });

  it("parses a Duration object with a string seconds field", () => {
    expect(parseDuration({ seconds: "1", nanos: 200000000 })).toBeCloseTo(1.2);
  });

  it("parses a Duration object with a numeric seconds field", () => {
    expect(parseDuration({ seconds: 1, nanos: 200000000 })).toBeCloseTo(1.2);
  });

  it("defaults undefined to 0", () => {
    expect(parseDuration(undefined)).toBe(0);
  });

  it("defaults an empty Duration object to 0", () => {
    expect(parseDuration({})).toBe(0);
  });

  it("throws on a malformed Duration string", () => {
    expect(() => parseDuration("abc")).toThrow(TypeError);
  });

  it("throws on a Duration object with a non-numeric seconds field", () => {
    expect(() => parseDuration({ seconds: "abc" })).toThrow(TypeError);
  });

  it("throws on a Duration object with a non-finite nanos field", () => {
    expect(() => parseDuration({ seconds: 1, nanos: NaN })).toThrow(TypeError);
  });
});
