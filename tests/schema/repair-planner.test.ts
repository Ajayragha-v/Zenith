import { describe, it, expect } from "vitest";
import { RepairPlanner } from "../../src/core/repair-planner.js";
import { IRSchema } from "../../src/schemas/ir.js";
import fs from "fs";
import path from "path";

describe("Master Strategy AI (S6 Planner)", () => {
  it("plans a fix for a high-confidence bug", () => {
    const irPath = path.resolve(__dirname, "../../fixtures/ir/valid_confirmed.json");
    const ir = IRSchema.parse(JSON.parse(fs.readFileSync(irPath, "utf-8")));

    const tasks = RepairPlanner.plan(ir);

    expect(tasks.length).toBe(1);
    expect(tasks[0]!.method).toBe("constrained_llm");
    expect(tasks[0]!.acceptanceCommand).toBe("pytest test.py");
    expect(tasks[0]!.target.enclosingSymbolId).toBe("sym-1");
  });

  it("abstains when confidence is too low", () => {
    const irPath = path.resolve(__dirname, "../../fixtures/ir/valid_confirmed.json");
    const ir = IRSchema.parse(JSON.parse(fs.readFileSync(irPath, "utf-8")));
    
    // Sabotage: Lower the confidence
    ir.diagnoses[0]!.confidence = 0.5;

    const tasks = RepairPlanner.plan(ir);

    expect(tasks[0]!.method).toBe("abstain"); // Rule: Low confidence -> do nothing
  });
});