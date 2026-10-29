import { ToolRunner } from "./tool-runner.js";
import { type Reproduction } from "../schemas/ir.js";
import fs from "fs";
import path from "path";

export class ReproductionEngine {
  static async reproduce(targetFile: string, root: string): Promise<Reproduction> {
    const testFile = `test_${targetFile}`;
    const hasTests = fs.existsSync(path.join(root, testFile));

    // If tests exist, run Pytest. If not, run the Python file directly!
    const command = "python";
    const args = hasTests ? ["-m", "pytest", testFile, "-v"] : [targetFile];
    
    let passCount = 0;
    let failCount = 0;
    const runs = 1; // Running the file once is enough to see if it crashes
    
    let lastStdout = "";
    let lastStderr = "";
    let lastExitCode: number | null = null;

    for (let i = 0; i < runs; i++) {
      const result = await ToolRunner.run(command, args, root);
      lastStdout = result.stdoutTail;
      lastStderr = result.stderrTail;
      lastExitCode = result.exitCode;

      if (result.exitCode === 0) {
        passCount++;
      } else {
        failCount++;
      }
    }

    const status = failCount > 0 ? "reproduced" : "non_reproducible";

    return {
      status,
      command: `${command} ${args.join(" ")}`,
      acceptanceCommand: `${command} ${args.join(" ")}`,
      exitCode: lastExitCode,
      runs,
      passCount,
      failCount,
      stdoutTail: lastStdout,
      stderrTail: lastStderr,
      reproductionSteps: [],
      metadata: {},
    };
  }
}