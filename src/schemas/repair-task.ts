import { z } from "zod";
import { SchemaVersionSchema } from "./common.js";

export const RepairMethodSchema = z.enum([
  "codemod",
  "lsp_refactor",
  "constrained_llm",
  "llm_agent",
  "template",
  "needs_human", 
  "abstain"
]);

export const RepairTaskSchema = z.object({
  schemaVersion: SchemaVersionSchema,
  taskId: z.string().min(1),
  diagnosisId: z.string().min(1),
  archetype: z.string().min(1),
  method: RepairMethodSchema,
  target: z.object({
    filePath: z.string().min(1),
    byteStart: z.number().int().min(0),
    byteEnd: z.number().int().min(0),
    enclosingSymbolId: z.string().min(1),
  }),
  acceptanceCommand: z.string().nullable().optional(),
  invariants: z.array(z.string()).default([]),
  maxDiffLines: z.number().int().positive().default(100),
   metadata: z.record(z.any()).optional(), 
});

export type RepairTask = z.infer<typeof RepairTaskSchema>;