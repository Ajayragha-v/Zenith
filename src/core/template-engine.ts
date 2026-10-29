import { RepairTask } from "../schemas/repair-task.js";
import { IR } from "../schemas/ir.js";
import { coreTemplates } from "../templates/index.js";

export class TemplateEngine {
  static apply(task: RepairTask, ir: IR, originalCode: string): string | null {
    const matchingTemplates = coreTemplates.filter(t => t.archetype === task.archetype);
    if (matchingTemplates.length === 0) return null;

    const functionCode = originalCode.slice(task.target.byteStart, task.target.byteEnd);
    const beforeFunction = originalCode.slice(0, task.target.byteStart);
    const afterFunction = originalCode.slice(task.target.byteEnd);

    const testOutput = (ir.reproduction?.stdoutTail || "") + "\n" + (ir.reproduction?.stderrTail || "");

    for (const template of matchingTemplates) {
      let replacement = template.replaceWith;
      let findPattern = template.findPattern;

      // 1. Human Input Replacement
      if ((task as any).humanInput) {
        replacement = replacement.replace("{{EXPECTED_VALUE}}", (task as any).humanInput);
      }

      // 2. Test Assertion Extraction
      if (replacement.includes("{{EXPECTED_VALUE}}") && !(task as any).humanInput) {
        const match = testOutput.match(/==\s*(\d+)/);
        if (match && match[1]) {
          replacement = replacement.replace("{{EXPECTED_VALUE}}", match[1]);
        } else {
          continue; 
        }
      }

      // 3. DYNAMIC TRACEBACK PARSING
      if (template.templateId === "fix-missing-variable") {
        const match = testOutput.match(/NameError: name '([^']+)' is not defined/);
        if (match && match[1]) {
          findPattern = `\\b${match[1]}\\b`;
          replacement = replacement.replace("{{VAR_NAME}}", match[1]);
        } else continue; 
      }
      
      if (template.templateId === "fix-key-error") {
        const keyName = (task as any).dictKey;
        
        if (keyName) {
          const escapedKey = keyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          findPattern = `\\[\\s*['"]${escapedKey}['"]\\s*\\]`;
          replacement = replacement.replace("{{EXPECTED_KEY}}", `"${keyName}"`);
        } else {
          const match = testOutput.match(/KeyError:\s*['"]([^'"]+)['"]/);
          if (match && match[1]) {
            findPattern = `\\[\\s*['"]${match[1]}['"]\\s*\\]`;
            replacement = replacement.replace("{{EXPECTED_KEY}}", `"${match[1]}"`);
          } else continue;
        }
        
        if (!(task as any).humanInput) return null; 
      }

      // 4. Fix missing argument in function signature
      if (template.templateId === "fix-missing-argument") {
        const match = testOutput.match(/missing 1 required positional argument: '([^']+)'/);
        if (match && match[1]) {
          const argName = match[1];
          replacement = replacement.replace("{{VAR_NAME}}", argName);
          findPattern = `def\\s+[a-zA-Z_][a-zA-Z0-9_]*\\(([^)]*)\\)`;
          
          const functionDefMatch = functionCode.match(new RegExp(findPattern));
          if (functionDefMatch) {
            const argsString = functionDefMatch[1] || "";
            
            // Convert comma-separated string into an array of arguments
            const argList = argsString.split(',').map(s => s.trim()).filter(Boolean);
            
            // Check if the argument already exists
            const existingIndex = argList.findIndex(a => a.split('=')[0]?.trim() === argName);
            
            if (existingIndex !== -1) {
              // Replace the existing argument with the default value
              argList[existingIndex] = replacement;
            } else {
              // Append the new argument to the end
              argList.push(replacement);
            }
            
            const newArgs = argList.join(', ');
            const newDef = functionDefMatch[0].replace(argsString, newArgs);
            return beforeFunction + functionCode.replace(functionDefMatch[0], newDef) + afterFunction;
          }
        }
        continue;
      }

      // Apply the patch
      const regex = new RegExp(findPattern, "g");
      const lines = functionCode.split("\n");
      const patchedLines: string[] = [];
      let matchFound = false;

      for (const line of lines) {
        if (line.trim().startsWith("#")) {
          patchedLines.push(line);
          continue;
        }

        if (regex.test(line)) {
          matchFound = true;
          if (template.action === "insert_before") {
            const indentMatch = line.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : "";
            patchedLines.push(`${indent}${replacement}`);
            patchedLines.push(line);
          } else {
            patchedLines.push(line.replace(regex, replacement));
          }
        } else {
          patchedLines.push(line);
        }
      }

      if (matchFound) {
        return beforeFunction + patchedLines.join("\n") + afterFunction;
      }
    }

    return null; 
  }
}