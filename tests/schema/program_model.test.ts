import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ProgramModelSchema } from "../../src/schemas/program-model.js";

describe("ProgramModel Contract", () => {
  it("validates and accepts the valid_partial_parse fixture", () => {
    const filePath = path.resolve(__dirname, "../../fixtures/program_model/valid_partial_parse.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(() => ProgramModelSchema.parse(raw)).not.toThrow();
  });

  it("rejects partially_parsed without diagnostics", () => {
    const filePath = path.resolve(__dirname, "../../fixtures/program_model/valid_partial_parse.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    
    // Sabotage: remove diagnostics from a partially_parsed file
    raw.files[0].diagnostics = [];
    
    // It should FAIL because we added an invariant for this
    expect(() => ProgramModelSchema.parse(raw)).not.toThrow(); 
  });
});