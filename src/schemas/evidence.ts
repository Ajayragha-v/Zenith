import { z } from "zod";
import { SchemaVersionSchema, SourceLocationSchema, MetadataSchema } from "./common.js";

export const EvidenceCategorySchema = z.enum([
  "syntax", "type", "lint", "security", "test_failure", "runtime_failure", "other",
]);

export const EvidenceSeveritySchema = z.enum(["error", "warning", "note", "info"]);

export const ToolStatusSchema = z.enum([
  "ok", "missing", "crashed", "timeout", "malformed_output",
]);

export const ToolRunSchema = z.object({
  toolName: z.string().min(1),
  toolVersion: z.string().optional(),
  status: ToolStatusSchema,
  exitCode: z.number().int().nullable().optional(),
  durationMs: z.number().int().nonnegative(),
  itemsProduced: z.number().int().nonnegative().default(0),
  stderrTail: z.string().max(2048).optional(),
  command: z.string(),
});

export const EvidenceSchema = z.object({
  schemaVersion: SchemaVersionSchema,
  id: z.string().min(1),
  source: z.string().min(1),
  ruleId: z.string().nullable().optional(),
  category: EvidenceCategorySchema,
  severity: EvidenceSeveritySchema,
  message: z.string().min(1),
  location: SourceLocationSchema.nullable().optional(),
  relatedLocations: z.array(SourceLocationSchema).default([]),
  fingerprint: z.string().min(1),
  confidence: z.number().min(0).max(1),
  confidenceBasis: z.enum(["tool_reported", "derived_from_rule", "default_by_category"]),
  metadata: MetadataSchema.optional().default({}),
});

export const EvidenceCollectionSchema = z.object({
  schemaVersion: SchemaVersionSchema,
  runId: z.string().min(1),
  items: z.array(EvidenceSchema).default([]),
  toolRuns: z.array(ToolRunSchema).default([]),
  capabilityGaps: z.array(z.string()).default([]),
  metadata: MetadataSchema.optional().default({}),
});

// ==========================================
// TYPE EXPORTS (This is what was missing!)
// ==========================================
export type ToolRun = z.infer<typeof ToolRunSchema>;
export type EvidenceCollection = z.infer<typeof EvidenceCollectionSchema>;