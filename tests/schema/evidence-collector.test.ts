import { describe, it, expect } from "vitest";
import { EvidenceCollector } from "../../src/core/evidence-collector.js";
import { ToolResult } from "../../src/core/tool-runner.js";
import { EvidenceCollectionSchema } from "../../src/schemas/evidence.js";

describe("Evidence Collector (Stage S3)", () => {
  it("successfully parses a tool's JSON output into Evidence", () => {
    // Simulate a ToolRunner result from a linter
    const mockResult: ToolResult = {
      status: "crashed", // Linters exit with code 1 when they find issues
      exitCode: 1,
      durationMs: 150,
      stdoutTail: JSON.stringify([
        {
          ruleId: "unused-variable",
          message: "Variable 'x' is assigned but never used",
          severity: "warning",
          filePath: "orders.py",
          location: {
            filePath: "orders.py",
            startLine: 5, startColumn: 4, endLine: 5, endColumn: 5,
            byteStart: 100, byteEnd: 101
          }
        }
      ]),
      stderrTail: "",
      stdoutTruncated: false,
      stderrTruncated: false
    };

    const collection = EvidenceCollector.collect("mock-linter", "mock-linter .", mockResult, "run-123");

    // Validate against Zod schema
    expect(() => EvidenceCollectionSchema.parse(collection)).not.toThrow();
    
    // Check that we extracted the data properly
    expect(collection.items.length).toBe(1);
    expect(collection.items[0]!.ruleId).toBe("unused-variable");
    expect(collection.toolRuns[0]!.status).toBe("crashed"); // Tool exited 1
    expect(collection.capabilityGaps.length).toBe(0);
  });

  it("records a capability gap when a tool is missing", () => {
    const mockResult: ToolResult = {
      status: "missing",
      exitCode: null,
      durationMs: 10,
      stdoutTail: "",
      stderrTail: "Command not found",
      stdoutTruncated: false,
      stderrTruncated: false
    };

    const collection = EvidenceCollector.collect("mypy", "mypy .", mockResult, "run-123");

    expect(collection.items.length).toBe(0);
    expect(collection.capabilityGaps).toContain("mypy:missing");
  });
});