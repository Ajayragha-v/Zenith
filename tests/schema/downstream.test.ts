import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
// Import directly from the specific schema files
import { IRSchema, type IR } from "../../src/schemas/ir.js";
import { 
  ProgramModelSchema, 
  type ProgramModel, 
  SymbolNodeSchema 
} from "../../src/schemas/program-model.js";

// This is the "Mock Planner" (what S6 will eventually be)
function mockPlanner(ir: IR, programModel: ProgramModel) {
  const top = ir.diagnoses.find((d) => d.topHypothesis);
  if (!top) return null;

  const symbol = programModel.symbols.find(
    (s) => s.id === top.rootCauseLocation.enclosingSymbolId
  );
  if (!symbol) return null;

  return {
    targetFile: top.rootCauseLocation.filePath,
    targetSymbol: symbol.name,
    isPublic: symbol.visibility === "public",
    acceptanceCommand: ir.reproduction?.acceptanceCommand,
  };
}

describe("Mock Downstream Consumer (S6 Planner)", () => {
  it("can build a RepairTask from a valid IR and ProgramModel", () => {
    const irPath = path.resolve(__dirname, "../../fixtures/ir/valid_confirmed.json");
    const pmPath = path.resolve(__dirname, "../../fixtures/program_model/valid_partial_parse.json");
    
    const rawIR = JSON.parse(fs.readFileSync(irPath, "utf-8"));
    const rawPM = JSON.parse(fs.readFileSync(pmPath, "utf-8"));

    const ir = IRSchema.parse(rawIR);
    const pm = ProgramModelSchema.parse(rawPM);

    const diag = ir.diagnoses[0];
    if (!diag) throw new Error("No diagnoses found");
    const rcLoc = diag.rootCauseLocation;
    
    // Create the mock symbol using Zod to avoid TypeScript strict errors
    const mockSymbol = SymbolNodeSchema.parse({
      id: "sym-1",
      name: "apply_discount",
      kind: "function",
      filePath: "orders.py",
      location: {
        filePath: rcLoc.filePath,
        startLine: rcLoc.startLine,
        startColumn: rcLoc.startColumn,
        endLine: rcLoc.endLine,
        endColumn: rcLoc.endColumn,
        byteStart: rcLoc.byteStart,
        byteEnd: rcLoc.byteEnd,
        fileContentHash: rcLoc.fileContentHash,
      },
      visibility: "private",
      references: []
    });

    pm.symbols.push(mockSymbol);

    const plan = mockPlanner(ir, pm);

    expect(plan).not.toBeNull();
    expect(plan?.targetFile).toBe("orders.py");
    expect(plan?.targetSymbol).toBe("apply_discount");
    expect(plan?.isPublic).toBe(false);
    expect(plan?.acceptanceCommand).toBe("pytest test.py");
  });
});