import { ProgramModel } from "../schemas/program-model.js";

export interface LanguageAdapter {
  name(): string;
  detect(root: string): Promise<number>;
  parse(filePath: string, rootPath: string, runId: string): Promise<ProgramModel>;
  runTests(scope: string): Promise<any>;
  format(code: string): Promise<string>;
  capabilities(): Record<string, boolean>;
}