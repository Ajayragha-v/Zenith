<<<<<<< HEAD
# Zenith — Code Debugging Prototype

> \\\\\\\*\\\\\\\*Cohort prototype submission | Early-stage, multi-stage debugging workflow\\\\\\\*\\\\\\\*

Zenith is an early-stage code-debugging prototype built in JavaScript/TypeScript. It explores how a debugging system can standardize program information, collect diagnostic evidence, represent possible root causes, plan a repair, and isolate a proposed change from the original file.

**Prototype status:** T he project demonstrates a connected workflow and shared contracts. It is **not yet a reliable automated bug detector or repair system**. Several pipeline stages use mock data or simulated outcomes; these limitations are documented below.

## The one flow this prototype demonstrates

**Input a Python file → parse it with Tree-sitter → create normalized evidence → produce a diagnosis IR → create a repair task → copy the file into a sandbox and display a proposed diff.**

The current CLI connects these stages to demonstrate the intended architecture. Some later stages are simulated, so a successful run must not be interpreted as proof that a real bug was found or fixed.

## What is implemented

* **Shared schemas:** Zod schemas define structured representations for program models, evidence, diagnosis IR, and repair tasks.
* **Language-adapter contract:** A common interface establishes the methods a language-specific adapter should provide.
* **Initial Python adapter:** Uses `tree-sitter` and `tree-sitter-python` to parse a Python file and detect whether Tree-sitter reports syntax errors.
* **Tool runner:** Wraps external command execution and captures process status, exit code, output tails, and duration.
* **Evidence and diagnosis scaffolding:** Converts tool output into structured evidence and maps evidence items into diagnosis records.
* **Repair planning:** Creates a structured repair task from the top diagnosis hypothesis.
* **Sandbox-oriented executor:** Copies the target file into `.zenith\\\\\\\_sandbox` so the original file is not directly modified by the prototype executor.
* **Automated tests:** Vitest tests cover schemas and selected pipeline components.

## Known limitations — read before running

This prototype deliberately does **not** claim complete or verified automated debugging.

* The Python adapter currently reports file-level parse status, but does not populate meaningful function, class, symbol, or control-flow information.
* The CLI writes and runs a **mock linter** that emits a simulated finding. This is not a real linter result.
* The reproduction stage currently runs a hard-coded failing Node.js command rather than reproducing the Python file's actual behavior.
* The diagnosis engine maps evidence to candidate diagnoses; it does not yet establish root cause through deep causal analysis.
* The repair planner creates a repair task, but the executor currently appends a comment rather than generating a semantic bug fix.
* Patch verification is simulated. The prototype does not run the acceptance test against the patched file, so a “verified” message is **not evidence that the bug was fixed**.
* `PythonAdapter.runTests()` is a stub, and `format()` returns the input unchanged.
* Multi-language support is an architectural goal, not a completed capability. The current prototype should be treated as Python-focused scaffolding.
* No hosted demo link or recording is included with this prototype.

These limitations are stated explicitly so reviewers can distinguish implemented behavior from planned functionality.

## Tech stack and why

|Technology|Role|
|-|-|
|JavaScript / TypeScript (Node.js)|Main runtime and implementation language|
|Zod|Runtime validation of shared data contracts|
|Tree-sitter + tree-sitter-python|Initial Python syntax-tree parsing|
|Vitest|Automated tests|
|`child\\\\\\\_process`|Running external commands through the tool runner|
|JSON|Structured fixtures and intermediate data|

## Prerequisites

* Node.js 22 or later
* npm 10 or later

Check your versions:

```bash
node --version
npm --version
```

## Setup

1. Extract the project folder.
2. Open a terminal in the folder containing `package.json`.
3. Install dependencies:

```bash
npm install
```

4. Check TypeScript compilation:

```bash
npm run build
```

5. Run the automated test suite:

```bash
npm test
```

For watch mode while developing:

```bash
npm run test:watch
```

## Run the prototype

Place a Python file in the project directory, or provide a path to an existing Python file. From the project root, run:

```bash
npx tsx src/cli.ts ./bug.py
```

Replace `./bug.py` with the path to your Python file.

The CLI prints the stages it runs and writes the sandbox copy under `.zenith\\\\\\\_sandbox/`. **Use a disposable test file for demonstrations:** the current CLI creates a temporary `mock-linter.cjs` file in the target file's directory while it runs. Do not point it at an important or untrusted repository.

Because the linter, reproduction, and verification stages are simulated, the output is an architectural demonstration—not a trustworthy assessment of the input file.

## Project layout

```text
src/
  adapters/
    base.ts
    python-adapter.ts
  core/
    diagnosis-engine.ts
    evidence-collector.ts
    executor.ts
    language-adapter.js
    repair-planner.ts
    reproduction-engine.ts
    tool-runner.ts
  schemas/
    common.ts
    evidence.ts
    ir.ts
    program-model.ts
    repair-task.ts
  utils/
    json.js
  cli.ts
tests/
  schema/
examples/
fixtures/
```

## What comes next

1. Populate the Python `ProgramModel` with functions, classes, symbols, imports, and source locations.
2. Replace mock findings with real Python diagnostics from tools such as Ruff and pytest.
3. Reproduce failures using a project-defined command and capture actual stdout, stderr, and exit status.
4. Make diagnoses evidence-based and preserve uncertainty when root cause is not established.
5. Generate a real, reviewable patch in an isolated workspace.
6. Run acceptance tests against the patched workspace and report success only when those tests actually pass.
7. Validate the workflow on small, known-bug fixtures before adding another language adapter.

## Submission note

This README documents the current prototype honestly: shared contracts and a connected pipeline are present, while real diagnosis, semantic repair, and patch verification remain unfinished. No hosted link or demo recording is currently provided.

=======
# Zenith
This is the project Zenith, a code refactor who resolves codes bugs and error and helps in remove the bad codes like dead codes, code complexity, code duplicity. This is the tool for the professionals and beginner.  
>>>>>>> 893635585940d1ac3cd8b9fabc2425eb55d9c8cd
