import fs from "fs";
import path from "path";
import { createTwoFilesPatch } from "diff";
import { RepairTask } from "../schemas/repair-task.js";
import { IR } from "../schemas/ir.js";
import { ToolRunner } from "./tool-runner.js";
import { TemplateEngine } from "./template-engine.js";
import { HumanAgent } from "./human-agent.js";
import { DuplicityEngine } from "./duplicity-engine.js";

export interface ExecutionResult {
  success: boolean;
  diff: string;
  verificationPassed: boolean;
  rejectedReason?: string;
}

export class Executor {
  static async execute(task: RepairTask, ir: IR, root: string): Promise<ExecutionResult> {
    const targetFile = path.basename(task.target.filePath);
    const sandboxPath = path.join(root, targetFile);

    // Snapshot the original code before touching it
    const originalCode = fs.readFileSync(sandboxPath, "utf-8");
    let patchedCode = originalCode;

    try {
      // ==========================================
      // 1. COMPLEXITY ENGINE (Metric-Aware)
      // ==========================================
      if (task.archetype === "code_complexity") {
        const metricsScript = path.join(process.cwd(), "scripts", "analyze_metrics.py");
        const reducerScript = path.join(process.cwd(), "scripts", "ast_reduce_complexity.py");

        console.log("   Analyzing complexity metrics (Before)...");
        const beforeResult = await ToolRunner.run("python", [metricsScript, targetFile], root);
        const beforeMetrics = JSON.parse(beforeResult.stdoutTail);

        console.log("   Running AST Complexity Engine...");
        await ToolRunner.run("python", [reducerScript, targetFile], root);
        
        patchedCode = fs.readFileSync(sandboxPath, "utf-8");

        if (patchedCode === originalCode) {
          return { success: false, diff: "", verificationPassed: false, rejectedReason: "AST Reducer found no changes to apply." };
        }

        console.log("   Analyzing complexity metrics (After)...");
        const afterResult = await ToolRunner.run("python", [metricsScript, targetFile], root);
        const afterMetrics = JSON.parse(afterResult.stdoutTail);

        console.log(`\n   📊 Metric Impact:`);
        console.log(`      Cyclomatic Complexity: ${beforeMetrics.cc} -> ${afterMetrics.cc}`);
        console.log(`      Max Nesting Depth:     ${beforeMetrics.max_nesting} -> ${afterMetrics.max_nesting}`);

        // Reject if metrics didn't improve!
        if (afterMetrics.cc >= beforeMetrics.cc && afterMetrics.max_nesting >= beforeMetrics.max_nesting) {
          fs.writeFileSync(sandboxPath, originalCode, "utf-8"); // Rollback
          return { success: false, diff: "", verificationPassed: false, rejectedReason: "Complexity metrics did not improve. Safely aborting." };
        }
        
        const userChoice = await HumanAgent.ask(`\n   Do you want to apply this complexity refactor? (yes/no)`);
        
        if (userChoice.trim().toLowerCase() !== "yes") {
          fs.writeFileSync(sandboxPath, originalCode, "utf-8"); // Rollback
          return { success: false, diff: "", verificationPassed: false, rejectedReason: "User rejected the complexity refactor." };
        }
        console.log("   ✅ User approved refactor.");
      } 
      
      // ==========================================
      // 2. DUPLICITY ENGINE (AST-Based)
      // ==========================================
      else if (task.archetype === "code_duplicity") {
        console.log("   Running AST Deduplicator...");
        
        const userChoice = await HumanAgent.ask(
          `\n   Zenith found a duplicate function and will delete it.\n   ⚠️ WARNING: If this function is imported in another file, this will break your app.\n   Do you want to proceed with AST deletion? (yes/no)`
        );
        
        if (userChoice.trim().toLowerCase() !== "yes") {
          return { success: false, diff: "", verificationPassed: false, rejectedReason: "User rejected the duplicity refactor." };
        }

        const result = await DuplicityEngine.fix(originalCode, root, targetFile);
        
        if (result.changesMade) {
          patchedCode = result.patchedCode;
          fs.writeFileSync(sandboxPath, patchedCode, "utf-8");
          console.log("   ✅ Duplicity removed and dependencies redirected.");
        } else {
          return { success: false, diff: "", verificationPassed: false, rejectedReason: "Could not safely deduplicate." };
        }
      }

      // ==========================================
      // 3. TEMPLATE ENGINE (Logic & Runtime Errors)
      // ==========================================
      else if (task.method === "template" || task.method === "needs_human") {
        console.log(`   Running Template Engine (Human Input: ${(task as any).humanInput || "None"})...`);
        
        if (task.archetype === "missing_variable" && !(task as any).humanInput) {
           console.log("   ❌ Rejected: Cannot fix missing variable without human intent.");
           return { success: false, diff: "", verificationPassed: false, rejectedReason: "No human intent provided." };
        }

        const patched = TemplateEngine.apply(task, ir, originalCode);
        if (patched) {
          patchedCode = patched;
          fs.writeFileSync(sandboxPath, patchedCode, "utf-8");
          console.log("   ✅ Template applied successfully.");
        } else {
          console.log("   ⚠️ No matching template found.");
          return { success: false, diff: "", verificationPassed: false, rejectedReason: "No template matched." };
        }
      } 

      // ==========================================
      // 4. RUFF ENGINE (Lint & Style Fixes)
      // ==========================================
      else if (task.method === "lsp_refactor" || task.archetype === "lint") {
        console.log("   Running real auto-fixer (ruff --fix)...");
        await ToolRunner.run("ruff", ["check", targetFile, "--fix", "--unsafe-fixes"], root);
        patchedCode = fs.readFileSync(sandboxPath, "utf-8");
      }

      // ==========================================
      // 5. VERIFICATION GATE (S8)
      // ==========================================
      const diff = createTwoFilesPatch(
        `a/${targetFile}`, `b/${targetFile}`, originalCode, patchedCode, "original", "patched"
      );

      console.log("   Verifying fix in sandbox...");
      const testFile = `test_${targetFile}`;
      const hasTests = fs.existsSync(path.join(root, testFile));
      
      // CRITICAL FIX: Only compare output for Refactoring (Complexity/Duplicity).
      // Bug fixes (KeyError, DivisionByZero) are EXPECTED to change the output!
      const isRefactor = task.archetype === "code_complexity" || task.archetype === "code_duplicity";

      if (!hasTests && isRefactor) {
         console.log("   ⚠️ No tests found. Running Original vs Patched Output Comparison...");
         
         // 1. Run the PATCHED code
         const patchResult = await ToolRunner.run("python", [targetFile], root);
         
         // 2. Restore original code temporarily to get original output
         fs.writeFileSync(sandboxPath, originalCode, "utf-8");
         const trueOrigResult = await ToolRunner.run("python", [targetFile], root);
         
         // 3. Put patched code back
         fs.writeFileSync(sandboxPath, patchedCode, "utf-8");

         if (trueOrigResult.stdoutTail !== patchResult.stdoutTail) {
             console.log(`\n❌ VERIFICATION FAILED. Output changed during refactor!`);
             console.log(`Original Output: ${trueOrigResult.stdoutTail.trim()}`);
             console.log(`Patched Output:  ${patchResult.stdoutTail.trim()}`);
             fs.writeFileSync(sandboxPath, originalCode, "utf-8"); // Rollback
             return { success: false, diff: "", verificationPassed: false, rejectedReason: "Output mismatch. Logic changed." };
         }
         console.log("   ✅ Output matches. Logic is preserved.");
      }

      // For Bug Fixes (KeyError, etc.), we just check if the patched code runs without crashing.
      const verifyArgs = hasTests ? ["-m", "pytest", testFile] : [targetFile];
      const testResult = await ToolRunner.run("python", verifyArgs, root);
      const verificationPassed = testResult.exitCode === 0;

      if (!verificationPassed) {
          console.log(`\n❌ VERIFICATION FAILED. Rolling back to original code.\n${testResult.stdoutTail}\n${testResult.stderrTail}`);
          fs.writeFileSync(sandboxPath, originalCode, "utf-8"); // Rollback
          return { success: false, diff: "", verificationPassed: false, rejectedReason: "Execution failed after patch." };
      }

      return { success: true, diff, verificationPassed: true };

    } catch (e: any) {
      // Absolute safety: If anything crashes, rollback.
      fs.writeFileSync(sandboxPath, originalCode, "utf-8");
      return { success: false, diff: "", verificationPassed: false, rejectedReason: e.message };
    }
  }
}