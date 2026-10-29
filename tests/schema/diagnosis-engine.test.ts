import { describe, it, expect } from "vitest";
import { DiagnosisEngine } from "../../src/core/diagnosis-engine.js";
import { ProgramModelSchema } from "../../src/schemas/program-model.js";
import { EvidenceCollectionSchema } from "../../src/schemas/evidence.js";
import { IRSchema } from "../../src/schemas/ir.js";
import fs from "fs";
import path from "path";

describe("Diagnosis Engine (Stage S5)", () => {
  it("produces a valid IR with a top hypothesis from Evidence", () => {
    const pmPath = path.resolve(__dirname, "../../fixtures/program_model/valid_partial_parse.json");
    const pm = ProgramModelSchema.parse(JSON.parse(fs.readFileSync(pmPath, "utf-8")));

    pm.symbols.push({
      id: "sym-123",
      name: "calculate_total",
      kind: "function",
      filePath: "orders.py",
      location: {
        filePath: "orders.py",
        startLine: 1, startColumn: 0, endLine: 10, endColumn: 0,
        byteStart: 0, byteEnd: 100, fileContentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      },
      visibility: "public",
      references: [],
      metadata: {} // FIXED: Added missing metadata
    });

    const mockEvidence = EvidenceCollectionSchema.parse({
      schemaVersion: "1.0.0",
      runId: "run-123",
      items: [{
        schemaVersion: "1.0.0",
        id: "ev-1",
        source: "mypy",
        category: "type",
        severity: "error",
        message: "Unsupported operand type",
        fingerprint: "123",
        confidence: 0.9,
        confidenceBasis: "tool_reported",
        location: {
          filePath: "orders.py",
          startLine: 5, startColumn: 4, endLine: 5, endColumn: 10,
          byteStart: 50, byteEnd: 60,
          fileContentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        }
      }],
      toolRuns: [],
      capabilityGaps: []
    });

    const ir = DiagnosisEngine.diagnose(mockEvidence, pm, "run-123");

    expect(() => IRSchema.parse(ir)).not.toThrow();
    expect(ir.diagnoses.length).toBe(1);
    expect(ir.diagnoses[0]!.topHypothesis).toBe(true);
    expect(ir.diagnoses[0]!.rootCauseLocation.enclosingSymbolId).toBe("sym-123");
  });
});