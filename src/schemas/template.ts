import { z } from "zod";

export const TemplateSchema = z.object({
  templateId: z.string(),
  archetype: z.string(), // e.g., "division_by_zero" or "logic_error"
  description: z.string(),
  // The regex to find the buggy code INSIDE the target function
  findPattern: z.string(),
  // The replacement code. Can use {{EXPECTED_VALUE}} placeholder
  replaceWith: z.string(),
  action: z.enum(["replace", "insert_before"]).default("replace"),
});

export type CodeTemplate = z.infer<typeof TemplateSchema>;