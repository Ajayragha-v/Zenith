# Zenith

**Deterministic Code Diagnosis and Repair Engine**

Zenith is a rule-driven code analysis and repair prototype. It is
designed to inspect Python programs, collect diagnostic evidence, plan
controlled repairs, and verify proposed changes before accepting them.

> Understand the program before modifying it. Every repair should have a
> traceable reason, explicit constraints, and a verification result. If
> the available evidence is insufficient, abstain rather than guess.

**Project status:** Prototype. The repository contains working building
blocks, but several capabilities described in the intended architecture
are incomplete or not yet integrated. In particular, full CFG
construction, comprehensive dependency analysis, strong semantic
verification, and production-grade sandboxing remain future work.

## Contents

-   [Overview](#overview)
-   [Current capabilities](#current-capabilities)
-   [Pipeline](#pipeline)
-   [Technology stack](#technology-stack)
-   [Architecture](#architecture)
-   [Control Flow Graph (CFG)](#control-flow-graph-cfg)
-   [Repair strategies](#repair-strategies)
-   [Verification and safety](#verification-and-safety)
-   [Known limitations](#known-limitations)
-   [Roadmap](#roadmap)
-   [Development setup](#development-setup)

## Overview

Software projects accumulate technical debt through overly complex
functions, duplicated implementations, fragile control flow, runtime
failures, and difficult-to-maintain logic. Manual diagnosis and
refactoring can be slow, while unconstrained AI-generated changes may
introduce regressions or alter business logic.

Zenith explores an evidence-driven alternative. It combines source
parsing, static-analysis tools, Python AST-based analysis and
transformations, structured diagnostic data, and execution-based checks.
Diagnosis, repair planning, transformation, and verification are
separated into distinct stages so they can be inspected and improved
independently.

Zenith is not currently a formally verified repair system, and the
presence of a repair strategy in a schema does not mean that strategy is
fully implemented.

## Current capabilities

The inspected implementation includes:

-   TypeScript/Node.js command-line orchestration.
-   Python parsing through Tree-sitter.
-   Basic symbol extraction and source metadata.
-   Ruff-based lint and cyclomatic-complexity findings.
-   Python AST-based duplicate-function detection.
-   AST scripts for selected complexity-reduction transformations.
-   Zod schemas for program models, evidence, diagnoses, and repair
    tasks.
-   A diagnosis engine that converts findings into structured diagnosis
    records.
-   A repair planner that selects a strategy or abstains.
-   Template-based repair logic for selected error categories.
-   Candidate execution and process-result collection.
-   Diff generation and rollback-oriented execution logic.
-   Vitest tests and Python test support through pytest.

The current Python adapter is partial: it does not yet populate all
function, class, and CFG data represented by the program-model schema.

## Pipeline

The intended workflow is:

``` text
Python source
     |
     v
Parsing and program model
     |
     v
Static analysis and runtime reproduction
     |
     v
Evidence collection
     |
     v
Diagnosis engine
     |
     v
Repair planner
     |
     v
Repair execution
     |
     v
Verification gate
     |
     +---- Pass ------> Accept candidate patch
     |
     +---- Fail ------> Reject / rollback
     |
     +---- Uncertain -> Abstain / request human input
```

### 1. Parsing

The Python adapter uses Tree-sitter to parse source code and extract
structural information such as symbols and source locations. Source
hashes can help identify the version of the analyzed input.

### 2. Detection and reproduction

The CLI invokes analysis tools and scripts:

-   **Ruff** reports lint findings and selected cyclomatic-complexity
    violations.
-   **Python `ast`** scripts inspect function structures, detect
    duplicate implementations, and perform selected transformations.
-   **Runtime execution** attempts to reproduce failures and captures
    exit status, standard output, standard error, and execution
    duration.

### 3. Evidence and diagnosis

Findings are represented as structured evidence. The diagnosis layer
converts findings into records containing information such as a
diagnosis identifier, description, root-cause hypothesis, confidence,
evidence references, and source location.

The current diagnosis logic is basic: it structures findings and selects
hypotheses, but does not yet perform comprehensive causal reasoning
across all evidence sources.

### 4. Repair planning

The repair planner selects a strategy based on the diagnosis and
available capabilities. The strategy model includes:

-   `codemod`
-   `lsp_refactor`
-   `constrained_llm`
-   `llm_agent`
-   `template`
-   `needs_human`
-   `abstain`

Not all declared strategies have active executors. Unsupported
strategies must not be treated as successful repairs.

### 5. Repair execution

The repository includes Python AST transformations for selected
complexity patterns, duplicate-function detection and deduplication
scripts, template-based transformations for selected problem categories,
and a human-intervention path for cases requiring additional intent.

### 6. Verification

The execution layer creates candidate changes, generates diffs, and
includes rollback-oriented behavior when verification fails. Execution
success alone is not proof of correctness. Stronger verification
requires relevant tests, explicit invariants, and checks that intended
behavior has been preserved.

## Technology stack

  -----------------------------------------------------------------------
  Technology                          Role
  ----------------------------------- -----------------------------------
  TypeScript                          Main orchestration, diagnosis,
                                      planning, schemas, and execution

  Node.js                             Runtime, CLI, filesystem and
                                      subprocess management

  Python                              AST-based analysis and
                                      transformation scripts

  Tree-sitter                         Source-code parsing into syntax
                                      trees

  Python `ast`                        Structural inspection and
                                      transformations

  Ruff                                Linting and complexity findings

  Zod                                 Runtime validation of structured
                                      data

  Vitest                              TypeScript testing

  pytest                              Python test execution where
                                      configured

  SHA-256                             Source-file fingerprinting

  Diff utilities                      Original-versus-patched comparison
  -----------------------------------------------------------------------

The current repository is primarily a CLI/backend prototype. It does not
include a complete web frontend or database-backed service. There is no
active LLM API integration in the inspected implementation; strategy
names such as `constrained_llm` and `llm_agent` are architectural
options, not proof of working LLM functionality.

## Architecture

The following is a conceptual view of the main modules. Check the
current repository for the exact files and invocation paths as the
project evolves.

``` text
Zenith/
├── src/
│   ├── adapters/
│   │   └── python-adapter.ts
│   ├── schemas/
│   │   ├── program-model.ts
│   │   ├── evidence.ts
│   │   ├── diagnosis.ts
│   │   └── repair-task.ts
│   ├── core/
│   │   ├── evidence-collector.ts
│   │   ├── diagnosis-engine.ts
│   │   ├── repair-planner.ts
│   │   ├── template-engine.ts
│   │   ├── reproduction-engine.ts
│   │   ├── executor.ts
│   │   └── human-agent.ts
│   └── cli.ts
├── scripts/
│   ├── detect_duplicates.py
│   ├── ast_deduplicate.py
│   ├── ast_reduce_complexity.py
│   └── analyze_metrics.py
├── tests/
├── package.json
└── README.md
```

The principal data representations are:

1.  **Program Model:** parsed program information, symbols, and intended
    control-flow information.
2.  **Evidence:** findings from analyzers and execution tools.
3.  **Diagnosis IR:** hypotheses and their supporting evidence.
4.  **Repair Task:** proposed repair strategy and constraints.
5.  **Execution Result:** candidate patch and verification outcome.

Zod validates structured data at important boundaries.

## Control Flow Graph (CFG)

A Control Flow Graph represents possible execution paths through a
function or program.

A CFG contains:

-   **Basic blocks:** sequences of instructions with a single entry and
    exit.
-   **Edges:** transitions between basic blocks.
-   **Entry block:** the starting point.
-   **Exit blocks:** possible function or program exits.

Typical edge types in the program model include `sequential`,
`branch_true`, `branch_false`, `loop_back`, `exception`, `return`, and
`unknown`.

### AST versus CFG

  -----------------------------------------------------------------------
  AST                                 CFG
  ----------------------------------- -----------------------------------
  Represents syntactic structure      Represents possible execution flow

  Shows nested statements and         Shows blocks and transitions
  expressions                         

  Useful for parsing and source       Useful for reachability and flow
  transformations                     analysis
  -----------------------------------------------------------------------

### Example

``` python
def classify(value):
    if value > 0:
        return "positive"
    else:
        return "non-positive"
```

A simplified CFG:

``` mermaid
flowchart TD
    A([Entry]) --> B{value > 0?}
    B -->|True| C[Return positive]
    B -->|False| D[Return non-positive]
    C --> E([Exit])
    D --> E
```

### Current CFG status

The program-model schema defines storage for control-flow graphs,
including blocks, edges, entry identifiers, and exit identifiers.
However, the current Python adapter does not yet construct and populate
complete CFGs. CFG-based reachability, path analysis, and graph-derived
complexity are therefore planned capabilities, not completed features.

Once implemented, CFG analysis can support unreachable-code detection,
branch and loop analysis, function-level complexity, control-flow-aware
refactoring, and future data-flow analysis.

For a connected control-flow graph, cyclomatic complexity is:

\[ M = E - N + 2P \]

where (E) is the number of edges, (N) is the number of nodes, and (P) is
the number of connected components. For one connected function graph,
(P=1).

## Repair strategies

### Complexity reduction

The Python AST reduction script targets selected nested conditional
structures and can apply transformations such as guard clauses.

Before:

``` python
def check_user(age, verified):
    if age >= 18:
        if verified:
            return "verified"
        else:
            return "unverified"
    else:
        return "underage"
```

Possible guard-clause form:

``` python
def check_user(age, verified):
    if age < 18:
        return "underage"
    if not verified:
        return "unverified"
    return "verified"
```

This illustrates the intended transformation. Every transformation must
still be checked against original behavior and project requirements.

### Duplicate-function detection

The duplicate-detection script uses Python AST representations to
fingerprint function arguments and bodies. This can identify identical
implementations even when function names differ.

The deduplication script attempts to redirect selected direct calls to a
canonical function and remove duplicate definitions. It is not yet a
complete dependency-safe refactoring system. Imports, aliases, attribute
access, callbacks, reflection, dynamic dispatch, and indirect references
need further analysis before deletion can be considered safe.

### Template-based repair

The template engine contains predefined transformations for selected
problem categories, including unsafe division, missing variables,
dictionary-key handling, and selected type or argument errors.

A template is only a candidate repair. Correct behavior depends on
program intent, so ambiguous repairs should request human input or
abstain.

## Verification and safety

A robust repair workflow should:

1.  Preserve an immutable copy of the original source.
2.  Apply a candidate transformation to a separate working copy.
3.  Generate an auditable diff.
4.  Run relevant tests and validation checks.
5.  Check explicit invariants and expected behavior.
6.  Accept the patch only when configured verification requirements
    pass.
7.  Reject the candidate and restore the original when verification
    fails.

### Safety limitations

A working directory and timeout do not constitute a secure sandbox.
Running untrusted code requires actual isolation and resource controls,
including filesystem restrictions, network restrictions, CPU and memory
limits, process limits, and controlled access to environment variables
and secrets.

Likewise, a program that exits successfully is not necessarily correct.
Test success is evidence, not a universal proof of semantic equivalence.
Zenith should abstain when the available evidence cannot establish that
a proposed repair meets the required safety conditions.

## Known limitations

  -----------------------------------------------------------------------
  Area                                Current limitation
  ----------------------------------- -----------------------------------
  CFG                                 Schema exists, but complete CFG
                                      construction is not integrated

  Program model                       Function, class, and control-flow
                                      extraction is incomplete

  Dependency analysis                 No comprehensive symbol-reference
                                      graph

  Diagnosis                           Basic finding-to-diagnosis
                                      conversion; limited causal
                                      reasoning

  Source locations                    Some findings use approximate
                                      offsets

  Complexity                          Custom metrics and Ruff
                                      calculations are not fully
                                      consistent

  Duplicate removal                   Does not guarantee safe handling of
                                      all reference types

  Transformations                     Python `ast.unparse()` can change
                                      comments and formatting

  Verification                        Execution success and output
                                      comparison are insufficient for
                                      general correctness

  Test discovery                      The working-copy process does not
                                      reliably preserve the original test
                                      environment

  Sandbox                             A working directory and timeout do
                                      not provide OS-level isolation

  Repair dispatch                     Some declared strategies do not
                                      have active executors
  -----------------------------------------------------------------------

These are development priorities, not capabilities that should be
claimed as solved.

## Roadmap

### Phase 1 --- Stabilize the engine

-   Resolve TypeScript compilation and test issues.
-   Correct test-file and project-fixture handling.
-   Make repair dispatch explicit.
-   Ensure unsupported strategies never report successful repairs.
-   Improve source-location accuracy.
-   Strengthen patch and rollback handling.

### Phase 2 --- Program understanding

-   Complete AST extraction.
-   Implement a real CFG builder.
-   Build symbol tables.
-   Extract function and class metadata.
-   Construct function dependency and reference graphs.

### Phase 3 --- Advanced static analysis

-   Per-function complexity analysis.
-   Reachability and unreachable-code detection.
-   Dead-code analysis.
-   Improved duplicate detection.
-   Data-flow analysis.
-   More reliable diagnosis correlation.

### Phase 4 --- Safe repair

-   CFG-aware transformations.
-   Dependency-aware duplicate removal.
-   More precise source edits.
-   Explicit repair invariants.
-   Confidence-based abstention.

### Phase 5 --- Verification and isolation

-   Preserve and execute the original test suite.
-   Add behavioral regression checks.
-   Add stronger semantic validation.
-   Introduce actual sandbox isolation.
-   Implement transactional patch acceptance and rollback.

### Phase 6 --- Language expansion

-   Mature Python support first.
-   Add additional language adapters.
-   Reuse a common intermediate representation.
-   Explore JavaScript/TypeScript support.

## Development setup

### Prerequisites

-   Node.js version compatible with the repository dependencies.
-   npm.
-   Python 3.
-   Ruff.
-   pytest, if running Python tests.

### Installation

``` bash
git clone <YOUR_REPOSITORY_URL>
cd Zenith
npm install
python -m pip install ruff pytest
```

### Build

``` bash
npm run build
```

### Tests

``` bash
npm test
python -m pytest
```

### Run the CLI

Use the command and arguments defined by the current `package.json`
scripts and `src/cli.ts`. Confirm the exact CLI syntax before running it
against a project.

**Note:** The inspected prototype had a TypeScript compilation issue and
test-environment problems. These commands describe the intended
workflow; they are not a claim that the current test suite passes
without fixes.

## Project status

Zenith is an actively developing prototype of a deterministic,
evidence-driven code diagnosis and repair engine.

Its current foundation includes parsing, static-analysis integration,
structured evidence and diagnosis models, repair planning, selected AST
transformations, and execution-based checks. Its next major milestones
are complete CFG generation, dependency-aware program analysis, reliable
repair dispatch, stronger verification, and secure execution isolation.

### Design principles

1.  **Determinism:** Prefer explicit rules and reproducible
    transformations.
2.  **Traceability:** Link every diagnosis to supporting evidence.
3.  **Controlled modification:** Apply changes through explicit repair
    tasks.
4.  **Verification:** Validate candidate changes before acceptance.
5.  **Abstention:** Do not modify code when confidence or evidence is
    insufficient.
6.  **Modularity:** Keep parsing, diagnosis, planning, execution, and
    verification independently testable.

------------------------------------------------------------------------

*Zenith --- Understand the program. Diagnose the problem. Repair with
evidence. Verify before accepting.*
