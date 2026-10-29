import { z } from "zod";
import {
  SchemaVersionSchema,
  SourceLocationSchema,
  ProjectMetadataSchema,
  MetadataSchema,
  TimestampSchema,
} from "./common.js";

export const ParserDiagnosticSchema = z.object({
  id: z.string().min(1),
  filePath: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["error", "warning", "info"]),
  location: SourceLocationSchema.nullable().optional(),
  parser: z.string().default("ast"),
  code: z.string().optional(),
  expected: z.array(z.string()).default([]),
  actual: z.string().nullable().optional(),
  recovered: z.boolean().default(false),
});

export const FileStatusSchema = z.enum([
  "parsed",
  "partially_parsed",
  "parse_failed",
  "unsupported_language",
  "too_large",
  "encoding_error",
  "truncated",
  "skipped",
]);

export const ImportNodeSchema = z.object({
  module: z.string().min(1),
  importedSymbols: z.array(z.string()).default([]),
  alias: z.string().nullable().optional(),
  location: SourceLocationSchema.nullable().optional(),
});

export const FileNodeSchema = z.object({
  path: z.string().min(1),
  language: z.string().min(1),
  status: FileStatusSchema.default("parsed"),
  lineCount: z.number().int().nonnegative().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  encoding: z.string().default("utf-8"),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/, "Must be SHA-256 hex"),

  imports: z.array(ImportNodeSchema).default([]),
  exports: z
    .array(
      z.object({
        name: z.string().min(1),
        kind: z.enum(["function", "class", "constant", "type", "default"]),
        location: SourceLocationSchema,
      }),
    )
    .default([]),

  diagnostics: z.array(ParserDiagnosticSchema).default([]),

  isGenerated: z.boolean().default(false),
  isVendored: z.boolean().default(false),
  hasDynamicCode: z.boolean().default(false),

  parserUsed: z.string().optional(),
  parseDurationMs: z.number().int().nonnegative().optional(),
  metadata: MetadataSchema.optional().default({}),
});

export const ParameterSchema = z.object({
  name: z.string().min(1),
  typeAnnotation: z.string().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  isVariadic: z.boolean().default(false),
});

export const FunctionNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filePath: z.string().min(1),
  location: SourceLocationSchema,
  parameters: z.array(ParameterSchema).default([]),
  returnType: z.string().nullable().optional(),
  isAsync: z.boolean().default(false),
  isGenerator: z.boolean().default(false),
  parentClass: z.string().nullable().optional(),
  docstring: z.string().nullable().optional(),
  metadata: MetadataSchema.optional().default({}),
});

export const ClassNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filePath: z.string().min(1),
  location: SourceLocationSchema,
  superclasses: z.array(z.string()).default([]),
  methods: z.array(z.string()).default([]),
  properties: z.array(z.string()).default([]),
  docstring: z.string().nullable().optional(),
  metadata: MetadataSchema.optional().default({}),
});

export const SymbolNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum([
    "variable",
    "constant",
    "function",
    "class",
    "method",
    "parameter",
    "import",
    "type",
    "unknown",
  ]),
  filePath: z.string().min(1),
  location: SourceLocationSchema,
  scope: z.string().nullable().optional(),
  declaredType: z.string().nullable().optional(),
  visibility: z
    .enum(["public", "private", "protected", "internal", "unknown"])
    .default("unknown"),
  references: z.array(SourceLocationSchema).default([]),
  metadata: MetadataSchema.optional().default({}),
});

export const ControlFlowEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  condition: z.string().nullable().optional(),
  type: z
    .enum([
      "sequential",
      "branch_true",
      "branch_false",
      "loop_back",
      "exception",
      "return",
      "unknown",
    ])
    .default("sequential"),
});

export const ControlFlowBlockSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  filePath: z.string().min(1),
  location: SourceLocationSchema.nullable().optional(),
  statements: z.array(z.string()).default([]),
});

export const ControlFlowGraphSchema = z.object({
  id: z.string().min(1),
  functionId: z.string().nullable().optional(),
  entryBlockId: z.string().optional(),
  exitBlockIds: z.array(z.string()).default([]),
  blocks: z.array(ControlFlowBlockSchema).default([]),
  edges: z.array(ControlFlowEdgeSchema).default([]),
});

export const ProgramModelSchema = z.object({
  schemaVersion: SchemaVersionSchema,
  runId: z.string().min(1, "runId is required"),
  snapshot: z.object({
    commit: z.string().min(1),
    timestamp: TimestampSchema,
  }),
  project: ProjectMetadataSchema,
  language: z.string().min(1),
  files: z.array(FileNodeSchema).min(1),
  functions: z.array(FunctionNodeSchema).default([]),
  classes: z.array(ClassNodeSchema).default([]),
  symbols: z.array(SymbolNodeSchema).default([]),
  controlFlow: z
    .object({
      graphs: z.record(z.string(), ControlFlowGraphSchema).default({}),
    })
    .default({ graphs: {} }),
  diagnostics: z.array(ParserDiagnosticSchema).default([]),
  capabilityGaps: z.array(z.string()).default([]),
  metadata: MetadataSchema.optional().default({}),
});
export type ProgramModel = z.infer<typeof ProgramModelSchema>;
