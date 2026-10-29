import { CodeTemplate } from "../schemas/template.js";

export const coreTemplates: CodeTemplate[] = [
  {
    templateId: "fix-division-by-zero",
    archetype: "division_by_zero",
    description: "Replaces division by zero with a safe fallback.",
    findPattern: "\\/\\s*0",
    replaceWith: "/ 1",
    action: "replace", // <--- Added
  },
  {
    templateId: "fix-return-mismatch",
    archetype: "logic_error",
    description: "Fixes a return value based on the expected test assertion.",
    findPattern: "return\\s+\\d+",
    replaceWith: "return {{EXPECTED_VALUE}}",
    action: "replace", // <--- Added
  },
  {
    templateId: "fix-boolean-mismatch",
    archetype: "logic_error",
    description: "Fixes a boolean return mismatch.",
    findPattern: "return\\s+(True|False)",
    replaceWith: "return {{EXPECTED_VALUE}}",
    action: "replace", // <--- Added
  },
  {
    templateId: "fix-missing-return",
    archetype: "logic_error",
    description: "Adds a missing return statement if the function body is just 'pass'.",
    findPattern: "pass$",
    replaceWith: "return {{EXPECTED_VALUE}}",
    action: "replace", // <--- Added
  },
  {
    templateId: "fix-string-mismatch",
    archetype: "logic_error",
    description: "Fixes a hardcoded string that fails the test assertion.",
    findPattern: "return\\s+['\"].*?['\"]",
    replaceWith: "return \"{{EXPECTED_STRING}}\"",
    action: "replace", // <--- Added
  },
  {
    templateId: "fix-index-out-of-bounds",
    archetype: "index_out_of_bounds",
    description: "Fixes an array index that is out of bounds.",
    findPattern: "\\[\\s*\\d+\\s*\\]",
    replaceWith: "[{{EXPECTED_VALUE}}]",
    action: "replace", // <--- Added
  },
  {
    templateId: "fix-missing-variable",
    archetype: "missing_variable",
    description: "Inserts an assignment statement for an undefined variable.",
    findPattern: "DYNAMIC", 
    replaceWith: "{{VAR_NAME}} = {{EXPECTED_VALUE}}",
    action: "insert_before", // <--- Added (This is the one we just built)
  },
  {
    templateId: "fix-key-error",
    archetype: "key_error",
    description: "Uses setdefault to insert a missing key into the dictionary.",
    findPattern: "DYNAMIC_KEY_ACCESS",
    replaceWith: ".setdefault({{EXPECTED_KEY}}, {{EXPECTED_VALUE}})",
    action: "replace", // <--- Added
  },
  {
    templateId: "fix-type-mismatch",
    archetype: "type_mismatch",
    description: "Casts a variable to the expected type.",
    findPattern: "DYNAMIC_VAR",
    replaceWith: "{{EXPECTED_VALUE}}",
    action: "replace", // <--- Added
  },
  {
    templateId: "fix-string-concat-typeerror",
    archetype: "type_error",
    description: "Casts the second operand to a string to prevent 'can only concatenate str' errors.",
    findPattern: "\\+\\s*([a-zA-Z_][a-zA-Z0-9_]*)",
    replaceWith: "+ str($1)",
    action: "replace", // <--- Added
  },
  {
    templateId: "fix-missing-argument",
    archetype: "missing_argument",
    description: "Adds a default value to a missing required argument.",
    findPattern: "DYNAMIC_SIGNATURE",
    replaceWith: "{{VAR_NAME}}={{EXPECTED_VALUE}}",
    action: "replace",
  },
];