export class ComplexityEngine {
  /**
   * Flattens nested if statements to reduce cyclomatic complexity.
   */
  static fix(code: string): { patchedCode: string, changesMade: boolean } {
    // Regex looks for nested ifs like:
    // if condition1:
    //     if condition2:
    const nestedIfRegex = /if\s+(.*?):\s*\n\s+if\s+(.*?):/g;
    
    let changesMade = false;
    const patchedCode = code.replace(nestedIfRegex, (match, cond1, cond2) => {
      changesMade = true;
      // Combine them with 'and'
      return `if ${cond1} and ${cond2}:`;
    });

    return { patchedCode, changesMade };
  }
}