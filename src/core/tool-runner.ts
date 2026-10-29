import { spawn } from "child_process";

export interface ToolResult {
  status: "ok" | "crashed" | "timeout" | "missing";
  exitCode: number | null;
  stdoutTail: string;
  stderrTail: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  durationMs: number;
}

export class ToolRunner {
  private static MAX_STDOUT = 8192;
  private static MAX_STDERR = 2048;

  static async run(command: string, args: string[], cwd: string, timeoutMs: number = 120000): Promise<ToolResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let isTimeout = false;
      let resolved = false;

      // Helper to prevent double-resolving (since error and close can both fire)
      const safeResolve = (result: ToolResult) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      const child = spawn(command, args, {
        cwd,
        shell: true, // Required on Windows for .cmd files (npm, npx)
        detached: process.platform !== "win32",
      });

      const timer = setTimeout(() => {
        isTimeout = true;
        try {
          if (process.platform === "win32") {
            // Windows: Force kill the process tree
            spawn("taskkill", ["/pid", child.pid!.toString(), "/f", "/t"]);
          } else {
            // Unix: Kill the process group
            process.kill(-child.pid!, "SIGKILL");
          }
        } catch (e) {}
      }, timeoutMs);

      child.stdout?.on("data", (data) => { stdout += data.toString(); });
      child.stderr?.on("data", (data) => { stderr += data.toString(); });

      child.on("error", (err: any) => {
        clearTimeout(timer);
        if (isTimeout) {
          return safeResolve({
            status: "timeout", exitCode: null,
            stdoutTail: stdout.slice(-this.MAX_STDOUT), stderrTail: stderr.slice(-this.MAX_STDERR),
            stdoutTruncated: stdout.length > this.MAX_STDOUT, stderrTruncated: stderr.length > this.MAX_STDERR,
            durationMs: Date.now() - startTime,
          });
        }

        safeResolve({
          status: "crashed", exitCode: null,
          stdoutTail: stdout.slice(-this.MAX_STDOUT), stderrTail: stderr.slice(-this.MAX_STDERR),
          stdoutTruncated: stdout.length > this.MAX_STDOUT, stderrTruncated: stderr.length > this.MAX_STDERR,
          durationMs: Date.now() - startTime,
        });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (isTimeout) {
          return safeResolve({
            status: "timeout", exitCode: null,
            stdoutTail: stdout.slice(-this.MAX_STDOUT), stderrTail: stderr.slice(-this.MAX_STDERR),
            stdoutTruncated: stdout.length > this.MAX_STDOUT, stderrTruncated: stderr.length > this.MAX_STDERR,
            durationMs: Date.now() - startTime,
          });
        }

        // Detect Windows "Command not found" inside cmd.exe
        const isMissing = code !== 0 && (
          stderr.toLowerCase().includes("not recognized") ||
          stderr.toLowerCase().includes("command not found") ||
          code === 9009
        );

        if (isMissing) {
          return safeResolve({
            status: "missing", exitCode: null, // <--- FIXED: return null, not the Windows code
            stdoutTail: stdout.slice(-this.MAX_STDOUT), stderrTail: stderr.slice(-this.MAX_STDERR),
            stdoutTruncated: stdout.length > this.MAX_STDOUT, stderrTruncated: stderr.length > this.MAX_STDERR,
            durationMs: Date.now() - startTime,
          });
        }

        safeResolve({
          status: code === 0 ? "ok" : "crashed",
          exitCode: code,
          stdoutTail: stdout.slice(-this.MAX_STDOUT), stderrTail: stderr.slice(-this.MAX_STDERR),
          stdoutTruncated: stdout.length > this.MAX_STDOUT, stderrTruncated: stderr.length > this.MAX_STDERR,
          durationMs: Date.now() - startTime,
        });
      });
    });
  }
}