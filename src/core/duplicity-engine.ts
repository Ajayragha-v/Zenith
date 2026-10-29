import path from "path";
import fs from "fs";
import { ToolRunner } from "./tool-runner.js";

export class DuplicityEngine {
  static async fix(originalCode: string, root: string, targetFile: string): Promise<{ patchedCode: string, changesMade: boolean }> {
    const scriptPath = path.join(process.cwd(), "scripts", "ast_deduplicate.py");
    
    const result = await ToolRunner.run("python", [scriptPath, targetFile], root);

    if (result.exitCode !== 0) {
      console.log("   ⚠️ AST Deduplicator failed:", result.stderrTail);
      return { patchedCode: originalCode, changesMade: false };
    }

    const patchedPath = path.join(root, targetFile);
    const patchedCode = fs.readFileSync(patchedPath, "utf-8");

    if (patchedCode === originalCode) {
      return { patchedCode: originalCode, changesMade: false };
    }

    return { patchedCode, changesMade: true };
  }
}