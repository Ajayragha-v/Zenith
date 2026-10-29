import { describe, it, expect, afterAll } from "vitest";
import { ToolRunner } from "../../src/core/tool-runner.js";
import fs from "fs";
import path from "path";

const HANG_FILE = path.resolve(__dirname, "../../hang.js");

describe("ToolRunner (Stage S3 Safety)", () => {
  afterAll(() => {
    if (fs.existsSync(HANG_FILE)) fs.unlinkSync(HANG_FILE);
  });

  it("handles a successful command (status: ok)", async () => {
    const result = await ToolRunner.run("node", ["-e", "console.log('hello')"], ".");
    expect(result.status).toBe("ok");
    expect(result.exitCode).toBe(0);
    expect(result.stdoutTail.trim()).toBe("hello");
  });

  it("handles a missing tool (status: missing)", async () => {
    const result = await ToolRunner.run("command-that-does-not-exist-123", [], ".");
    expect(result.status).toBe("missing");
    expect(result.exitCode).toBeNull();
  });

  it("handles a crashing tool (status: crashed)", async () => {
    const result = await ToolRunner.run("node", ["-e", "process.exit(1)"], ".");
    expect(result.status).toBe("crashed");
    expect(result.exitCode).toBe(1);
  });

  it("kills hanging tools on timeout (status: timeout)", async () => {
    // Create a file that hangs for 10 seconds
    fs.writeFileSync(HANG_FILE, "setTimeout(() => {}, 10000);", "utf-8");

    // Run it, but timeout after 100ms
    const result = await ToolRunner.run("node", [HANG_FILE], ".", 100);
    
    expect(result.status).toBe("timeout");
    expect(result.durationMs).toBeLessThan(2000); 
  });
});