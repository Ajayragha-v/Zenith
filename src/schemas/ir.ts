import { z } from "zod";
import {
  SchemaVersionSchema,
  SourceLocationSchema,
  ProjectMetadataSchema,
  MetadataSchema,
  TimestampSchema,
} from "./common.js";
import { EvidenceSchema } from "./evidence.js";

export const IRStatusSchema = z.enum([
  "confirmed_failure",
  "suspected_root_cause",
  "inconclusive",
  "unresolved_intent",
  "success_no_findings",
]);

export const ReproductionSchema = z.object({
  status: z.enum(["reproduced","flaky","non_reproducible","not_attempted","not_applicable",]),
  command: z.string().nullable().optional(),
  acceptanceCommand: z.string().nullable().optional(),
  exitCode: z.number().int().nullable().optional(),
  runs: z.number().int().nonnegative().default(0),
  passCount: z.number().int().nonnegative().default(0),
  failCount: z.number().int().nonnegative().default(0),
  stdoutTail: z.string().max(8192).default(""),
  stderrTail: z.string().max(2048).default(""),
  reproductionSteps: z.array(z.string()).default([]),
  metadata: MetadataSchema.optional().default({}),
  environment: z.string().optional(),

});

export const DiagnosisSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  rootCause: z.string().min(1),
  confidence: z.number().min(0).max(1),
  supportingEvidenceIds: z.array(z.string()).default([]),
  contradictingEvidenceIds: z.array(z.string()).default([]),
  missingInfo: z.array(z.string()).default([]),
  topHypothesis: z.boolean().default(false),
  rootCauseLocation: z.object({
    filePath: z.string().min(1),
    startLine: z.number().int().min(1),
    startColumn: z.number().int().min(0),
    endLine: z.number().int().min(1),
    endColumn: z.number().int().min(0),
    byteStart: z.number().int().min(0),
    byteEnd: z.number().int().min(0),
    fileContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    enclosingSymbolId: z.string().min(1),
  }),
  relatedLocations: z.array(SourceLocationSchema).default([]),
  alternatives: z.array(z.string()).default([]),
  metadata: MetadataSchema.optional().default({}),
});

const RawIRSchema = z.object({
  schemaVersion: SchemaVersionSchema,
  runId: z.string().min(1),
  status: IRStatusSchema,
  project: ProjectMetadataSchema,
  language: z.string().min(1),
  summary: z.string().min(1),
  programModelRef: z
    .object({
      path: z.string(),
      contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      stats: z.object({
        fileCount: z.number().int().nonnegative(),
        nodeCount: z.number().int().nonnegative(),
        parseFailures: z.number().int().nonnegative(),
      }),
    })
    .nullable()
    .optional(),
  evidence: z.array(EvidenceSchema).default([]),
  reproduction: ReproductionSchema.nullable().optional(),
  diagnoses: z.array(DiagnosisSchema).default([]),
  capabilityGaps: z.array(z.string()).default([]),
  runStartedAt: TimestampSchema,
  runCompletedAt: TimestampSchema,
  limitations: z.array(z.string()).default([]),
  metadata: MetadataSchema.optional().default({}),
});

export const IRSchema = RawIRSchema.superRefine((ir, ctx) => {
  const evidenceIds = new Set((ir.evidence || []).map((e) => e.id));

  (ir.diagnoses || []).forEach((diagnosis, dIdx) => {
    (diagnosis.supportingEvidenceIds || []).forEach((refId, rIdx) => {
      if (!evidenceIds.has(refId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unresolved supporting evidence: "${refId}"`,
          path: ["diagnoses", dIdx, "supportingEvidenceIds", rIdx],
        });
      }
    });
    (diagnosis.contradictingEvidenceIds || []).forEach((refId, rIdx) => {
      if (!evidenceIds.has(refId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unresolved contradicting evidence: "${refId}"`,
          path: ["diagnoses", dIdx, "contradictingEvidenceIds", rIdx],
        });
      }
    });
  });

  if (ir.diagnoses && ir.diagnoses.length > 0) {
    const tops = ir.diagnoses.filter((d) => d.topHypothesis);
    if (tops.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one diagnosis must be marked topHypothesis",
        path: ["diagnoses"],
      });
    }
    if (tops.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one diagnosis may be marked topHypothesis",
        path: ["diagnoses"],
      });
    }
  }

  if (ir.reproduction) {
    const r = ir.reproduction;
    if (r.status === "reproduced" && (r.runs === 0 || r.failCount !== r.runs)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reproduced requires failCount === runs",
        path: ["reproduction"],
      });
    }
    if (
      r.status === "flaky" &&
      (r.passCount === 0 || r.failCount === 0 || r.runs === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "flaky requires passCount > 0 and failCount > 0",
        path: ["reproduction"],
      });
    }
  }

  if (new Date(ir.runCompletedAt) < new Date(ir.runStartedAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "runCompletedAt must be >= runStartedAt",
      path: ["runCompletedAt"],
    });
  }
});
export type IR = z.infer<typeof IRSchema>;
export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type Reproduction = z.infer<typeof ReproductionSchema>;