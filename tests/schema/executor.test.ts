import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Executor } from "../../src/core/executor.js";
import { RepairTask } from "../../src/schemas/repair-task.js";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../../");
const TEST_FILE = "executor-test.py";
const TEST_FILE_PATH = path.join(ROOT, TEST_FILE);

describe("Executor (S7 & S8)", () => {
  beforeAll(() => {
    // Create a dummy file for the executor to fix
    fs.writeFileSync(TEST_FILE_PATH, "def foo():\n    pass\n", "utf-8");
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(TEST_FILE_PATH)) fs.unlinkSync(TEST_FILE_PATH);
    const sandbox = path.join(ROOT, ".zenith_sandbox");
    if (fs.existsSync(sandbox)) fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("generates a patch and verifies it in a sandbox", async () => {
    const mockTask: RepairTask = {
      schemaVersion: "1.0.0",
      taskId: "task-123",
      diagnosisId: "diag-123",
      archetype: "null_deref",
      method: "constrained_llm",
      target: {
        filePath: TEST_FILE,
        byteStart: 0,
        byteEnd: 10,
        enclosingSymbolId: "sym-1"
      },
      acceptanceCommand: "node -e process.exit(0)",
      invariants: [],
      maxDiffLines: 50
    };

    const result = await Executor.execute(mockTask, ROOT);

    expect(result.success).toBe(true);
    expect(result.verificationPassed).toBe(true);
    expect(result.diff).toContain("# Zenith: Fixed the bug here!");

    // Verify original file was NOT touched
    const originalCode = fs.readFileSync(TEST_FILE_PATH, "utf-8");
    expect(originalCode).not.toContain("Fixed the bug");

    // Verify sandbox file WAS touched
    const sandboxFile = path.join(ROOT, ".zenith_sandbox", TEST_FILE);
    const sandboxCode = fs.readFileSync(sandboxFile, "utf-8");
    expect(sandboxCode).toContain("Fixed the bug");
  });
});