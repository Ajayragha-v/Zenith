import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PythonAdapter } from "../../src/adapters/python-adapter.js";
import { ProgramModelSchema } from "../../src/schemas/program-model.js";
import fs from "fs";
import path from "path";

// Define where the fake file will live
const DUMMY_PATH = path.resolve(__dirname, "../../dummy.py");

describe("Python Adapter (S1 & S2)", () => {
  // 1. Create the file before the test starts
  beforeAll(() => {
    fs.writeFileSync(DUMMY_PATH, "def calculate_total(price, discount):\n    return price - discount\n", "utf-8");
  });

  // 2. Delete the file after the test finishes
  afterAll(() => {
    if (fs.existsSync(DUMMY_PATH)) {
      fs.unlinkSync(DUMMY_PATH);
    }
  });

  it("parses a real python file into a valid ProgramModel", async () => {
    const adapter = new PythonAdapter();
    // We pass "." as the rootPath, and "dummy.py" as the filePath
    const model = await adapter.parse("dummy.py", ".", "run-123");
    
    // 1. It must pass our strict Zod schema
    expect(() => ProgramModelSchema.parse(model)).not.toThrow();

    const file = model.files[0]!;

    // 2. It must correctly detect the file status
    expect(file.status).toBe("parsed");
    
    // 3. It must generate a valid SHA-256 hash
    expect(file.contentHash.length).toBe(64);
  });
});