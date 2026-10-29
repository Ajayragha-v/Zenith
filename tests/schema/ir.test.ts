import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { IRSchema } from "../../src/schemas/ir.js";

describe("IR Contract", () => {
  it("validates and accepts the valid_confirmed fixture", () => {
    const filePath = path.resolve(__dirname, "../../fixtures/ir/valid_confirmed.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(() => IRSchema.parse(raw)).not.toThrow();
  });

  it("rejects IR with zero top hypotheses", () => {
    const filePath = path.resolve(__dirname, "../../fixtures/ir/valid_confirmed.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    
    raw.diagnoses[0].topHypothesis = false;
    
    expect(() => IRSchema.parse(raw)).toThrow(/At least one diagnosis must be marked topHypothesis/);
  });

  it("rejects IR with two top hypotheses", () => {
    const filePath = path.resolve(__dirname, "../../fixtures/ir/valid_confirmed.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    
    const clone = JSON.parse(JSON.stringify(raw.diagnoses[0]));
    clone.id = "diag-2";
    clone.topHypothesis = true;
    raw.diagnoses.push(clone);
    
    expect(() => IRSchema.parse(raw)).toThrow(/Exactly one diagnosis may be marked topHypothesis/);
  });

  it("rejects IR when a diagnosis references an unknown evidence ID", () => {
    const filePath = path.resolve(__dirname, "../../fixtures/ir/valid_confirmed.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    
    raw.diagnoses[0].supportingEvidenceIds = ["ev-DOES-NOT-EXIST"];
    
    expect(() => IRSchema.parse(raw)).toThrow(/Unresolved supporting evidence/);
  });
});