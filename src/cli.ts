import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PythonAdapter } from "./adapters/python-adapter.js";
import { ToolRunner } from "./core/tool-runner.js";
import { ReproductionEngine } from "./core/reproduction-engine.js";
import { DiagnosisEngine } from "./core/diagnosis-engine.js";
import { RepairPlanner } from "./core/repair-planner.js";
import { Executor } from "./core/executor.js";
import { HumanAgent } from "./core/human-agent.js";

async function main() {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error("Usage: npx tsx src/cli.ts <path-to-python-file>");
    process.exit(1);
  }

  console.log(`\n🚀 Zenith Procedural Engine starting on: ${targetFile}\n`);
  const runId = `run-${Date.now()}`;
  const root = path.dirname(targetFile);
  const fileName = path.basename(targetFile);
  const outputDir = path.join(root, "output");
  
  // Clean up previous output
  if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  // Copy original file to output folder to begin
  let currentWorkingFile = path.join(outputDir, fileName);
  fs.copyFileSync(path.join(root, fileName), currentWorkingFile);

  let iteration = 0;
  const maxAttempts = 5; // Prevent infinite loops

  while (iteration < maxAttempts) {
    iteration++;
    console.log(`\n--- Loop Iteration ${iteration} ---`);
    
    // 1. RE-PARSE the current working file
    const adapter = new PythonAdapter();
    const programModel = await adapter.parse(fileName, outputDir, runId);
    
    // Read the current code once per loop iteration
    const currentCode = fs.readFileSync(currentWorkingFile, "utf-8");

    // 2. Run Linter (Ruff)
    console.log("1. Running linter (ruff)...");
    const toolResult = await ToolRunner.run("ruff", ["check", fileName, "--select", "C901", "--config", "lint.mccabe.max-complexity=5", "--output-format=json"], outputDir);
    
    let ruffEvidence: any[] = [];
    if (toolResult.stdoutTail) {
      try {
        const parsed = JSON.parse(toolResult.stdoutTail);
        for (const item of parsed) {
          ruffEvidence.push({
            schemaVersion: "1.0.0",
            id: `ev-${crypto.randomUUID()}`,
            source: "ruff",
            ruleId: item.code || "unknown",
            category: "lint",
            severity: "error",
            message: item.message,
            fingerprint: crypto.createHash("sha256").update(item.code + item.location.row).digest("hex"),
            confidence: 0.95,
            confidenceBasis: "tool_reported",
            location: {
              filePath: fileName,
              startLine: item.location.row,
              startColumn: item.location.column,
              endLine: item.end_location.row,
              endColumn: item.end_location.column,
              byteStart: item.location.row * 10, 
              byteEnd: item.end_location.row * 10 + 5,
              fileContentHash: programModel.files[0]?.contentHash || "0".repeat(64)
            }
          });
        }
      } catch (e) {}
    }

    // --- NATIVE AST DUPLICITY DETECTOR ---
    console.log("3. Checking for code duplicity (AST)...");
    const detectScript = path.join(process.cwd(), "scripts", "detect_duplicates.py");
    const detectResult = await ToolRunner.run("python", [detectScript, targetFile], outputDir);
    
    let duplicityFound = false;
    if (detectResult.stdoutTail) {
      try {
        const report = JSON.parse(detectResult.stdoutTail);
        if (report.duplicates && report.duplicates.length > 0) {
          const dup = report.duplicates[0];
          console.log(`   ⚠️ Duplicity found: ${dup.duplicate} is identical to ${dup.canonical}`);
          
          ruffEvidence.push({
            schemaVersion: "1.0.0",
            id: `ev-dup-${Date.now()}`,
            source: "zenith-ast",
            ruleId: "duplicate-function",
            category: "lint",
            severity: "warning",
            message: `Duplicate code detected: ${dup.duplicate} duplicates ${dup.canonical}`,
            fingerprint: `dup-${dup.duplicate}`,
            confidence: 0.99,
            confidenceBasis: "derived_from_rule",
            location: {
              filePath: fileName,
              startLine: 1, 
              startColumn: 0,
              endLine: 1,
              endColumn: 1,
              byteStart: 0,
              byteEnd: 0,
              fileContentHash: programModel.files[0]?.contentHash || "0".repeat(64)
            }
          } as any);
          duplicityFound = true;
        }
      } catch(e) {
        console.log("   ⚠️ Failed to parse Python duplicate detector output.");
      }
    }
    
    if (!duplicityFound) {
      console.log("   ✅ No duplicity detected by AST.");
    }

    // 3. Check for Runtime Errors (Single File Execution)
    console.log("2. Checking for runtime crashes...");
    const reproduction = await ReproductionEngine.reproduce(fileName, outputDir);
    
    if (reproduction.status === "reproduced") {
       ruffEvidence.push({
        schemaVersion: "1.0.0",
        id: `ev-test-${Date.now()}`,
        source: "python-runtime", 
        ruleId: "runtime_failure", 
        category: "runtime_failure",
        severity: "error",
        message: `Execution failed. Output: ${reproduction.stdoutTail || ""} ${reproduction.stderrTail || ""}`,
        fingerprint: "runtime-failure-hash", 
        confidence: 0.99,
        confidenceBasis: "tool_reported",
        location: {
          filePath: fileName,
          startLine: 1, startColumn: 0, endLine: 1, endColumn: 1,
          byteStart: 0, byteEnd: 1000, 
          fileContentHash: programModel.files[0]?.contentHash || "0".repeat(64)
        }
      } as any);
    }

    // 4. If no bugs, we are done!
    if (ruffEvidence.length === 0) {
      console.log("\n✅ No more bugs found. The code is clean!");
      break;
    }

    // 5. Diagnose & Plan for ONE bug at a time
    const evidence = {
      schemaVersion: "1.0.0" as const,
      runId,
      items: ruffEvidence,
      toolRuns: [],
      capabilityGaps: [],
      metadata: {}
    };

    const ir = DiagnosisEngine.diagnose(evidence, programModel, runId);
    ir.reproduction = reproduction;
    
    const tasks = RepairPlanner.plan(ir);
    
    if (tasks.length === 0) {
      console.log("⚠️ No tasks planned. Breaking loop.");
      break;
    }

    // Only take the FIRST task to maintain procedural chunk-by-chunk execution
    const task = tasks[0]!;
    console.log(`3. Planning: Method = ${task.method} | Archetype = ${task.archetype}`);

    // 6. Interactive Human Intervention (Context-Aware)
    if (task.method === "needs_human") {
      let question = `What should the value of this logic be? (${task.archetype})`;
      const errorTrace = (reproduction.stderrTail || "") + (reproduction.stdoutTail || "");
      const functionCode = currentCode.slice(task.target.byteStart, task.target.byteEnd);

      if (task.archetype === "code_complexity") {
        question = `This function is too complex. How would you like to refactor it? (Type 'skip' to skip)`;
      } 
      else if (task.archetype === "missing_variable") {
        const match = errorTrace.match(/NameError: name '([^']+)' is not defined/);
        const varName = match ? match[1] : "unknown";
        question = `\n   Found NameError: The variable '${varName}' is not defined.\n   Code:\n${functionCode.trim()}\n\n   👉 What value should '${varName}' be?`;
      } 
      else if (task.archetype === "key_error") {
        const match = errorTrace.match(/KeyError:\s*['"]([^'"]+)['"]/);
        const keyName = match ? match[1] : "unknown";
        question = `\n   Found KeyError: The dictionary key '${keyName}' does not exist.\n   Code:\n${functionCode.trim()}\n\n   👉 What default value should be used for '${keyName}'? (Include quotes if it's a string)`;
        
        (task as any).dictKey = keyName; 
      }
      else if (task.archetype === "division_by_zero") {
        question = `\n   Found ZeroDivisionError.\n   Code:\n${functionCode.trim()}\n\n   👉 What should the denominator (the 0) be replaced with? (e.g., 1)`;
      }
      else if (task.archetype === "index_out_of_bounds") {
        question = `\n   Found IndexError: List index out of range.\n   Code:\n${functionCode.trim()}\n\n   👉 What is a safe index to use instead? (e.g., 0)`;
      }
      else if (task.archetype === "value_error") {
        question = `\n   Found ValueError: Invalid conversion (e.g., trying to convert a word to a number).\n   Code:\n${functionCode.trim()}\n\n   👉 What fallback value should be used if the conversion fails?`;
      }
      else if (task.archetype === "type_error") {
        question = `\n   Found TypeError: Type mismatch (e.g., adding a string to an integer).\n   Code:\n${functionCode.trim()}\n\n   👉 Press Enter to let Zenith auto-cast this safely, or type a fallback value.`;
      }
       else if (task.archetype === "missing_argument") {
        question = `\n   Found TypeError: The function is missing a required argument.\n   Code:\n${functionCode.trim()}\n\n   👉 Zenith cannot auto-fix caller arguments yet. Please type 'skip' to fix this manually.`;
      }
      
      const userAnswer = await HumanAgent.ask(question);

      if (userAnswer.trim().toLowerCase() === "skip") {
        console.log("\n⏭️  User skipped this issue. Halting pipeline so you can fix it manually.");
        break; 
      }

      (task as any).humanInput = userAnswer; 
    }

    // 7. Execute Patch
    console.log("4. Executing patch in sandbox...");
    const result = await Executor.execute(task, ir, outputDir);

    if (!result.success || !result.verificationPassed) {
      console.log(`   ❌ Verification failed. Reason: ${result.rejectedReason || "Unknown"}`);
      if (task.method === "needs_human") {
        console.log("   Let's try again.");
        continue; 
      }
      break; 
    }

    console.log("   ✅ Patch applied and verified!");
    console.log(result.diff);
  }

  if (iteration >= maxAttempts) {
    console.log("\n🛑 Max attempts reached. Halting to prevent infinite loops.");
    console.log("⚠️ STATUS: UNRESOLVED_INTENT");
    console.log("Zenith could not find a patch that satisfies the tests without breaking known behavior.");
    console.log("The code requires human developer intervention.");
  }

  console.log("\n🏁 Final patched file is available in the /output directory.");
}

main().catch((err) => {
  console.error("❌ Pipeline failed:", err);
  process.exit(1);
});