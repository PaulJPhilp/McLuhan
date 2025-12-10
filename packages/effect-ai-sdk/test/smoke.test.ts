import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import * as AiSdk from "../src/index.js";

describe("Smoke Test", () => {
  it("should export core functions", () => {
    expect(AiSdk.generateText).toBeDefined();
    expect(AiSdk.generateObject).toBeDefined();
    expect(AiSdk.generateEmbeddings).toBeDefined();
  });

  it("should export error types", () => {
    expect(AiSdk.AiSdkOperationError).toBeDefined();
  });
});
