import { EvidenceCollection } from "../schemas/evidence.js";
import { ProgramModel } from "../schemas/program-model.js";
import { IR, Diagnosis } from "../schemas/ir.js";
import crypto from "crypto";

export class DiagnosisEngine {
  /**
   * Takes Evidence and a ProgramModel, and produces a finalized IR.
   */
  static diagnose(
    evidence: EvidenceCollection,
    programModel: ProgramModel,
    runId: string
  ): IR {
    const diagnoses: Diagnosis[] = [];

    // 1. If there is no evidence, the code is clean.
    if (evidence.items.length === 0) {
      return {
        schemaVersion: "1.0.0",
        runId,
        status: "success_no_findings",
        project: programModel.project,
        language: programModel.language,
        summary: "No issues found.",
        runStartedAt: new Date().toISOString(),
        runCompletedAt: new Date().toISOString(),
        diagnoses: [],
        evidence: [],
        capabilityGaps: evidence.capabilityGaps,
        limitations: [], // FIXED: Added missing field
        metadata: {},
      };
    }

    // 2. Map evidence to diagnoses
    for (const item of evidence.items) {
      let enclosingSymbolId = "unknown-symbol";
      
      if (item.location) {
        const symbol = programModel.symbols.find((s) => 
          s.filePath === item.location?.filePath &&
          item.location.byteStart >= s.location.byteStart &&
          item.location.byteEnd <= s.location.byteEnd
        );
        if (symbol) enclosingSymbolId = symbol.id;
      }

      diagnoses.push({
        id: `diag-${crypto.randomUUID()}`,
        title: `Fix ${item.ruleId}`,
        description: item.message,
        rootCause: item.message,
        confidence: item.confidence,
        supportingEvidenceIds: [item.id],
        contradictingEvidenceIds: [],
        missingInfo: [],
        topHypothesis: false, 
        rootCauseLocation: {
          filePath: item.location?.filePath || "unknown",
          startLine: item.location?.startLine || 1,
          startColumn: item.location?.startColumn || 0,
          endLine: item.location?.endLine || 1,
          endColumn: item.location?.endColumn || 0,
          byteStart: item.location?.byteStart || 0,
          byteEnd: item.location?.byteEnd || 0,
          fileContentHash: item.location?.fileContentHash || "0".repeat(64),
          enclosingSymbolId,
        },
        relatedLocations: [],
        alternatives: [],
        metadata: item.metadata || {},
      });
    }

    // 3. Mark the highest-confidence diagnosis as the top hypothesis
    if (diagnoses.length > 0) {
      diagnoses.sort((a, b) => b.confidence - a.confidence);
      diagnoses[0]!.topHypothesis = true;
    }

    return {
      schemaVersion: "1.0.0",
      runId,
      status: "suspected_root_cause",
      project: programModel.project,
      language: programModel.language,
      summary: `Found ${diagnoses.length} potential issues.`,
      runStartedAt: new Date().toISOString(),
      runCompletedAt: new Date().toISOString(),
      diagnoses,
      evidence: evidence.items,
      capabilityGaps: evidence.capabilityGaps,
      limitations: [], // FIXED: Added missing field
      metadata: {},
    };
  }
}