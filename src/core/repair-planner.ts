import { IR } from "../schemas/ir.js";
import { RepairTask, RepairTaskSchema } from "../schemas/repair-task.js";
import crypto from "crypto";

export class RepairPlanner {
  static plan(ir: IR): RepairTask[] {
    const tasks: RepairTask[] = [];

    for (const diag of ir.diagnoses) {
      if (!diag.topHypothesis) continue;

      const archetype = this.classify(diag);

      if (archetype === "security" || diag.description.toLowerCase().includes("security")) {
        tasks.push(this.createTask(diag, "security", "abstain", ir));
        continue;
      }

      const method = this.selectMethod(archetype, diag, ir);
      tasks.push(this.createTask(diag, archetype, method, ir));
    }

    return tasks;
  }

  private static classify(diag: any): string {
    const msg = (diag.title + " " + diag.description).toLowerCase();
    
    if (msg.includes("zerodivisionerror")) return "division_by_zero";
    if (msg.includes("indexerror")) return "index_out_of_bounds";
    if (msg.includes("nameerror")) return "missing_variable";
    if (msg.includes("keyerror")) return "key_error";
    
    // 1. CHECK MISSING ARGUMENT BEFORE TYPEERROR!
    if (msg.includes("missing") && msg.includes("required positional argument")) {
      return "missing_argument";
    }

    if (msg.includes("valueerror")) return "value_error";
    if (msg.includes("typeerror")) return "type_error";
    if (msg.includes("attributeerror") || msg.includes("nonetype")) return "attribute_error";

    if (msg.includes("c901") || msg.includes("too complex")) return "code_complexity";
    if (msg.includes("duplicate") || msg.includes("duplicity")) return "code_duplicity";

    if (msg.includes("unused") || msg.includes("imported but")) return "lint";
    if (msg.includes("syntax")) return "syntax_error";
    if (msg.includes("import")) return "missing_import";
    
    if (msg.includes("test suite failed") || msg.includes("execution failed")) return "logic_error";
    
    return "lint"; 
  }

  private static selectMethod(archetype: string, diag: any, ir: IR): any {
    if (diag.confidence < 0.6) return "abstain";

    if (archetype === "code_complexity") return "template";
    if (archetype === "code_duplicity") return "template";
    if (archetype === "missing_import") return "lsp_refactor";
    if (archetype === "syntax_error") return "constrained_llm";
    
    if (
      archetype === "division_by_zero" || 
      archetype === "logic_error" ||
      archetype === "index_out_of_bounds" ||
      archetype === "missing_variable" ||
      archetype === "missing_argument" || // <--- ROUTE TO TEMPLATE
      archetype === "key_error" ||
      archetype === "value_error" ||
      archetype === "type_error" ||
      archetype === "attribute_error"
    ) {
      return "needs_human"; 
    }
    
    return "abstain"; 
  }

  private static createTask(diag: any, archetype: string, method: any, ir: IR): RepairTask {
    return RepairTaskSchema.parse({
      schemaVersion: "1.0.0",
      taskId: `task-${crypto.randomUUID()}`,
      diagnosisId: diag.id,
      archetype,
      method,
      target: {
        filePath: diag.rootCauseLocation.filePath,
        byteStart: diag.rootCauseLocation.byteStart,
        byteEnd: diag.rootCauseLocation.byteEnd,
        enclosingSymbolId: diag.rootCauseLocation.enclosingSymbolId,
      },
      acceptanceCommand: ir.reproduction?.acceptanceCommand || null,
      invariants: ["preserve_public_api", "no_new_dependencies"],
      maxDiffLines: 50,
      metadata: diag.metadata || {}, 
    });
  }
}