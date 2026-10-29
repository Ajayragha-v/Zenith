import fs from "fs";
import path from "path";
import crypto from "crypto";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import { LanguageAdapter } from "./base.js";
import { ProgramModel } from "../schemas/program-model.js";

export class PythonAdapter implements LanguageAdapter {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    // @ts-ignore
    this.parser.setLanguage(Python);
  }

  name(): string {
    return "python";
  }

  async detect(root: string): Promise<number> {
    if (fs.existsSync(path.join(root, "pyproject.toml"))) return 1.0;
    return 0.5;
  }

  async parse(filePath: string, rootPath: string, runId: string): Promise<ProgramModel> {
    const absolutePath = path.join(rootPath, filePath);
    const sourceCode = fs.readFileSync(absolutePath, "utf-8");
    
    const contentHash = crypto.createHash("sha256").update(sourceCode).digest("hex");
    const tree = this.parser.parse(sourceCode);
    const hasError = tree.rootNode.hasError;
    
    // --- REAL AST EXTRACTION ---
    const symbols: any[] = [];
    
    const walk = (node: any) => {
      if (node.type === "function_definition" || node.type === "class_definition") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) {
          symbols.push({
            id: `sym-${crypto.randomUUID()}`,
            name: nameNode.text,
            kind: node.type === "function_definition" ? "function" : "class",
            filePath: filePath,
            location: {
              filePath: filePath,
              startLine: node.startPosition.row + 1,
              startColumn: node.startPosition.column,
              endLine: node.endPosition.row + 1,
              endColumn: node.endPosition.column,
              byteStart: node.startIndex,
              byteEnd: node.endIndex,
              fileContentHash: contentHash,
            },
            visibility: "public",
            references: [],
            metadata: {}
          });
        }
      }
      for (const child of node.children) {
        walk(child);
      }
    };
    walk(tree.rootNode);

    return {
      schemaVersion: "1.0.0",
      runId,
      snapshot: { commit: "mock-commit", timestamp: new Date().toISOString() },
      project: { name: "demo-project", rootPath: rootPath, metadata: {} },
      language: this.name(),
      files: [{
        path: filePath,
        language: this.name(),
        status: hasError ? "partially_parsed" : "parsed",
        contentHash: contentHash,
        encoding: "utf-8",
        imports: [],
        exports: [],
        diagnostics: hasError ? [{
          id: "err-1", filePath, message: "Syntax error", severity: "error", parser: "tree-sitter-python", expected: [], recovered: true
        }] : [],
        isGenerated: false, isVendored: false, hasDynamicCode: false, metadata: {},
      }],
      functions: [],
      classes: [],
      symbols: symbols, // <--- This now contains your functions!
      controlFlow: { graphs: {} },
      diagnostics: [],
      capabilityGaps: [],
      metadata: {},
    };
  }

  async runTests(scope: string): Promise<any> { return {}; }
  async format(code: string): Promise<string> { return code; }
  capabilities(): Record<string, boolean> { return { hasTypes: false }; }
}