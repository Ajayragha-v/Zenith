/**
 * Zenith Detective - Common Contract Schemas
 *
 * Defines reusable primitives across ProgramModel, Evidence, and IR.
 *
 * Source Location Convention:
 * - Line numbers are ONE-BASED (1-indexed, starting at 1).
 * - Column numbers are ZERO-BASED (0-indexed, starting at 0).
 * - BYTE OFFSETS ARE AUTHORITATIVE. Line/column are for human display only.
 * - Spans must satisfy: byteEnd >= byteStart.
 * - Spans must satisfy: endLine > startLine OR (endLine === startLine && endColumn >= startColumn).
 *
 * SCHEMA VERSION:
 * - CURRENT_SCHEMA_VERSION is a literal. Bumping it is a breaking change.
 * - Major bump: required field added/removed, or semantics changed.
 * - Minor bump: optional field added.
 * - Patch bump: bug fix / no contract change.
 *
 * BUFFER NAMING:
 * - Tool output buffers are `*Tail` (last N bytes), capped by schema.
 * - Full output lives on disk in the run artifact directory, not in contracts.
 */

import { z } from "zod";

/**
 * Current schema version. Every artifact (ProgramModel, Evidence, IR)
 * carries this exact value in its `schemaVersion` field.
 */
export const CURRENT_SCHEMA_VERSION = "1.0.0";

export const SchemaVersionSchema = z.literal(CURRENT_SCHEMA_VERSION);

/**
 * Standard ISO 8601 timestamp string.
 */
export const TimestampSchema = z
  .string()
  .datetime({ message: "Timestamp must be a valid ISO 8601 datetime string" });

/**
 * Generic extensible metadata object.
 *
 * Anything used by more than one stage belongs as a top-level field,
 * not buried in metadata. Metadata is an escape hatch, not a contract.
 */
export const MetadataSchema = z.record(z.string(), z.unknown());

/**
 * Source code location representation.
 *
 * AUTHORITATIVE fields (used by all code manipulation):
 *   - byteStart, byteEnd: exact byte offsets into the file
 *   - fileContentHash: SHA-256 of the entire file at parse time
 *
 * DISPLAY-ONLY fields (used by human-readable reports):
 *   - startLine, startColumn, endLine, endColumn
 *
 * Downstream stages must use byte offsets to locate code.
 * Line/column may drift if whitespace changes; byte offsets are the truth.
 * fileContentHash lets S7 assert "the file has not changed since parse."
 */
export const SourceLocationSchema = z
  .object({
    filePath: z.string().min(1, "filePath must not be empty"),

    // Display coordinates
    startLine: z.number().int().min(1, "startLine must be 1-based (>= 1)"),
    startColumn: z.number().int().min(0, "startColumn must be 0-based (>= 0)"),
    endLine: z.number().int().min(1, "endLine must be 1-based (>= 1)"),
    endColumn: z.number().int().min(0, "endColumn must be 0-based (>= 0)"),

    // Authoritative byte offsets — the truth for all code manipulation
    byteStart: z
      .number()
      .int()
      .min(0, "byteStart must be >= 0")
      .describe("Authoritative byte offset; use this for all code edits"),
    byteEnd: z
      .number()
      .int()
      .min(0, "byteEnd must be >= 0")
      .describe("Authoritative byte offset; use this for all code edits"),

    // File content hash — lets S7 detect drift
    fileContentHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/, {
        message:
          "fileContentHash must be a 64-character lowercase SHA-256 hex string",
      })
      .describe(
        "SHA-256 of the file at parse time; used to detect drift before patching",
      ),
  })
  .refine((loc) => loc.byteEnd >= loc.byteStart, {
    message: "byteEnd must be >= byteStart",
    path: ["byteEnd"],
  })
  .refine(
    (loc) => {
      if (loc.endLine < loc.startLine) return false;
      if (loc.endLine === loc.startLine && loc.endColumn < loc.startColumn)
        return false;
      return true;
    },
    {
      message: "endLine/endColumn must not precede startLine/startColumn",
      path: ["endLine"],
    },
  );

/**
 * Project metadata describing the inspected codebase.
 */
export const ProjectMetadataSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  rootPath: z.string().min(1, "rootPath is required"),
  version: z.string().optional(),
  description: z.string().optional(),
  metadata: MetadataSchema.optional().default({}),
});

/**
 * Tool execution result recording command invocation details.
 *
 * Buffers are TAIL-capped (last N bytes). Full output lives on disk.
 * This prevents the IR/evidence from OOMing on chatty tools and keeps
 * accidental secret leakage (in stdout) to a bounded tail.
 */
export const ToolExecutionResultSchema = z.object({
  toolName: z.string().min(1, "toolName is required"),
  command: z.string().optional(),
  exitCode: z.number().int(),
  stdoutTail: z.string().max(8192).default(""),
  stderrTail: z.string().max(2048).default(""),
  stdoutTruncated: z.boolean().default(false),
  stderrTruncated: z.boolean().default(false),
  durationMs: z.number().nonnegative().optional(),
  timestamp: TimestampSchema,
  metadata: MetadataSchema.optional().default({}),
});
