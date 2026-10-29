import crypto from "crypto";
import { ToolResult } from "./tool-runner.js";
import { 
  EvidenceCollection, 
  EvidenceSchema, 
  ToolRunSchema, 
  ToolStatusSchema,
  type ToolRun 
} from "../schemas/evidence.js";

export class EvidenceCollector {
  
  /**
   * Takes a ToolResult from the ToolRunner and normalizes it into our Evidence Schema.
   */
  static collect(
    toolName: string,
    command: string,
    toolResult: ToolResult,
    runId: string
  ): EvidenceCollection {
    
    const items: any[] = [];
    const gaps: string[] = [];

    // 1. Record the ToolRun status (Explicitly typed so it accepts "malformed_output")
    const toolRun: ToolRun = {
      toolName,
      status: toolResult.status,
      exitCode: toolResult.exitCode,
      durationMs: toolResult.durationMs,
      itemsProduced: 0,
      command,
    };

    // 2. Handle failures (Missing or Timeout)
    if (toolResult.status === "missing" || toolResult.status === "timeout") {
      gaps.push(`${toolName}:${toolResult.status}`);
    } 
    // 3. Parse output if it succeeded (or crashed with valid JSON output)
    else if (toolResult.stdoutTail) {
      try {
        const parsed = JSON.parse(toolResult.stdoutTail);
        
        for (const finding of parsed) {
          const fingerprint = crypto
            .createHash("sha256")
            .update(`${toolName}-${finding.ruleId}-${finding.filePath}-${finding.line}`)
            .digest("hex");

          items.push({
            schemaVersion: "1.0.0",
            id: `ev-${crypto.randomUUID()}`,
            source: toolName,
            ruleId: finding.ruleId || "unknown-rule",
            category: "lint",
            severity: finding.severity || "error",
            message: finding.message,
            location: finding.location ? {
              filePath: finding.location.filePath,
              startLine: finding.location.startLine,
              startColumn: finding.location.startColumn,
              endLine: finding.location.endLine,
              endColumn: finding.location.endColumn,
              byteStart: finding.location.byteStart || 0,
              byteEnd: finding.location.byteEnd || 0,
              fileContentHash: "0000000000000000000000000000000000000000000000000000000000000000",
            } : undefined,
            relatedLocations: [],
            fingerprint,
            confidence: 0.9,
            confidenceBasis: "tool_reported",
            metadata: {},
          });
        }
      } catch (e) {
        // If we can't parse the JSON, mark it as malformed
        toolRun.status = "malformed_output"; // Now TypeScript allows this!
        gaps.push(`${toolName}:malformed_output`);
      }
    }

    toolRun.itemsProduced = items.length;

    return {
      schemaVersion: "1.0.0",
      runId,
      items,
      toolRuns: [toolRun],
      capabilityGaps: gaps,
      metadata: {},
    };
  }
}