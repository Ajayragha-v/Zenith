# ZENITH --- Build Summary

**Project:** Zenith\
**Category:** Developer Productivity / Code Analysis and Repair\
**Project Type:** Deterministic, evidence-driven code diagnosis and
repair prototype\
**Primary Language:** TypeScript\
**Target Language:** Python

------------------------------------------------------------------------

## 1. Project Overview

Zenith is a code diagnosis and repair prototype designed to identify
selected software-quality issues in Python programs, collect structured
evidence, plan controlled repairs, and verify candidate changes before
accepting them.

The project addresses a common problem in software maintenance: complex,
duplicated, and fragile code can be difficult to diagnose and refactor
safely. Manual refactoring is time-consuming, while unconstrained
automated code generation can introduce regressions or unintentionally
change business logic.

Zenith follows an evidence-driven approach. It separates program
parsing, issue detection, diagnosis, repair planning, code
transformation, and verification into distinct stages. Its design favors
reproducible, rule-based operations and supports abstaining or
requesting human input when the system cannot confidently determine a
safe repair.

**Current status:** Working prototype with partially integrated
capabilities. The project should not yet be described as a fully
autonomous, formally verified, or production-secure repair system.

## 2. Problem Statement

Software projects accumulate technical debt through:

-   High cyclomatic complexity and deeply nested conditions.
-   Duplicate or redundant function implementations.
-   Runtime failures and fragile logic.
-   Difficult-to-maintain code structures.
-   Refactoring changes that may introduce regressions.

Existing manual workflows require developers to inspect code, understand
its structure and dependencies, identify the root cause, implement a
fix, and run tests. Automated repair systems also need safeguards to
prevent a plausible-looking change from silently altering intended
behavior.

Zenith aims to make this workflow more structured, traceable, and
verifiable.

## 3. Proposed Solution

Zenith processes source code through a modular pipeline:

``` text
Python Source Code
        |
        v
Parsing and Program Model
        |
        v
Static Analysis / Runtime Reproduction
        |
        v
Evidence Collection
        |
        v
Diagnosis Engine
        |
        v
Repair Planner
        |
        v
Repair Execution
        |
        v
Verification Gate
        |
        +---- Pass ------> Candidate patch accepted
        |
        +---- Fail ------> Candidate rejected / rollback
        |
        +---- Uncertain -> Abstain / human intervention
```

The pipeline is designed to keep each stage independently inspectable.
Findings are represented as structured data and linked to diagnoses and
repair tasks instead of relying only on unstructured error messages.

## 4. Implemented Components

The inspected repository contains the following implementation building
blocks.

### 4.1 Source Parsing

-   Uses Tree-sitter to parse Python source.
-   Extracts basic symbol information and source metadata.
-   Uses source hashing to help identify the analyzed input version.
-   Defines a program-model schema for representing program structure.

**Current limitation:** The Python adapter does not yet populate
complete function, class, and control-flow graph information.

### 4.2 Static Analysis and Detection

-   Integrates Ruff for lint-related findings and selected
    cyclomatic-complexity checks.
-   Uses Python's built-in `ast` module for structural inspection.
-   Includes a duplicate-function detection script that fingerprints
    function arguments and bodies.
-   Includes scripts for selected AST-based complexity-reduction
    transformations.

### 4.3 Structured Evidence and Diagnosis

-   Defines structured evidence and diagnosis schemas using Zod.
-   Represents findings with information such as source, rule, severity,
    message, confidence, and location.
-   Converts findings into diagnosis records.
-   Maintains evidence references and root-cause hypotheses.

**Current limitation:** Diagnosis is primarily rule/finding-driven.
Comprehensive causal reasoning and correlation across multiple
independent evidence sources are not yet implemented.

### 4.4 Repair Planning

The repair planner models strategies such as:

-   `codemod`
-   `lsp_refactor`
-   `constrained_llm`
-   `llm_agent`
-   `template`
-   `needs_human`
-   `abstain`

The planner is intended to choose an available repair method or decline
to modify code when the evidence is insufficient.

**Current limitation:** Not all declared strategies have active
execution implementations. Strategy names in the schema should not be
interpreted as completed capabilities.

### 4.5 Repair Execution

The repository contains:

-   Python AST-based transformations for selected nested-condition and
    complexity patterns.
-   Duplicate-function detection and deduplication scripts.
-   A template engine for selected problem categories.
-   A human-intervention path for cases that require additional program
    intent.
-   Candidate patch and diff handling.

### 4.6 Verification

The execution layer includes candidate execution, process-result
collection, diff generation, and rollback-oriented behavior when checks
fail.

**Current limitation:** Execution success or output comparison alone
cannot prove semantic correctness. Reliable acceptance requires relevant
tests and explicit behavioral constraints.

## 5. Technology Stack

  -----------------------------------------------------------------------
  Technology                          Purpose
  ----------------------------------- -----------------------------------
  TypeScript                          Main orchestration, diagnosis,
                                      repair planning, schemas, and
                                      execution

  Node.js                             CLI runtime, filesystem operations,
                                      and subprocess management

  Python                              AST-based analysis and
                                      transformation scripts

  Tree-sitter                         Parsing source code into syntax
                                      trees

  Python `ast`                        Structural analysis and source
                                      transformations

  Ruff                                Linting and complexity findings

  Zod                                 Runtime validation of structured
                                      data

  Vitest                              TypeScript testing

  pytest                              Python test execution where
                                      configured

  SHA-256                             Source-file fingerprinting

  Diff utilities                      Candidate patch comparison
  -----------------------------------------------------------------------

The inspected project is primarily a CLI/backend prototype. It does not
contain a complete web frontend or database-backed application. No
active LLM API integration was found in the inspected implementation.

## 6. Control Flow Graph (CFG)

A Control Flow Graph represents the possible execution paths through a
function. Its nodes represent basic blocks, while its edges represent
transitions such as sequential execution, conditional branches,
loop-back paths, returns, and exceptions.

The program-model schema defines structures for CFG blocks, edges, entry
blocks, and exit blocks. However, the current Python adapter does not
yet construct and populate complete CFGs.

CFG generation is therefore a planned architectural capability, not a
completed feature.

Once implemented, CFG analysis can support:

-   Reachability and unreachable-code detection.
-   Branch and loop analysis.
-   Function-level cyclomatic complexity.
-   Detection of redundant or impossible paths.
-   Control-flow-aware refactoring.
-   Future data-flow analysis.

For a control-flow graph, cyclomatic complexity can be calculated as:

\[ M = E - N + 2P \]

where (E) is the number of edges, (N) is the number of nodes, and (P) is
the number of connected components.

## 7. Key Engineering Principles

1.  **Deterministic operations:** Prefer explicit rules and reproducible
    transformations.
2.  **Evidence traceability:** Link diagnoses to the findings that
    support them.
3.  **Controlled repair:** Represent proposed changes as explicit repair
    tasks.
4.  **Verification before acceptance:** Check candidate changes before
    treating them as successful.
5.  **Safe abstention:** Avoid making changes when evidence or
    confidence is insufficient.
6.  **Modularity:** Keep parsing, diagnosis, planning, execution, and
    verification independently testable.

## 8. Current Limitations and Risks

The following gaps were identified during source inspection:

  -----------------------------------------------------------------------
  Area                                Current status / limitation
  ----------------------------------- -----------------------------------
  CFG generation                      Schema exists; complete graph
                                      construction is not integrated

  Program-model extraction            Function, class, and control-flow
                                      extraction is incomplete

  Dependency analysis                 No comprehensive symbol-reference
                                      graph

  Diagnosis                           Basic finding-to-diagnosis
                                      conversion; limited causal
                                      reasoning

  Source locations                    Some findings use approximate
                                      offsets

  Complexity metrics                  Custom metrics and Ruff
                                      calculations are not fully
                                      consistent

  Duplicate removal                   Does not guarantee safe handling of
                                      all reference types

  Source preservation                 `ast.unparse()` may alter comments
                                      and formatting

  Test execution                      Working-copy handling does not
                                      reliably preserve the original test
                                      environment

  Verification                        Execution success is not proof of
                                      semantic correctness

  Sandbox                             Working directories and timeouts
                                      are not OS-level isolation

  Repair dispatch                     Some declared strategies do not
                                      have active executors
  -----------------------------------------------------------------------

These limitations mean that Zenith should currently be presented as a
prototype rather than a production-ready autonomous repair platform.

## 9. Development and Validation Notes

The source archive was inspected across its TypeScript modules, Python
scripts, schemas, tests, and fixtures.

The inspection identified:

-   A TypeScript compilation issue in an executor test call: the test
    supplies two arguments while the current method signature requires
    three.
-   Test-environment problems involving the packaged Vitest executable
    and a missing Rollup platform dependency.
-   Python analysis scripts that passed bytecode syntax compilation.
-   A mismatch between the sample `test_real_bug.py` import and the
    function defined in `real_bug.py`.
-   Inconsistencies between some tests and the current repair-planner
    behavior.

A complete passing test suite has **not** been established. These
findings should be resolved before claiming full build or test success.

## 10. Future Development Plan

### Phase 1 --- Stabilize the prototype

-   Resolve TypeScript compilation and test issues.
-   Correct test and project-fixture handling.
-   Make repair dispatch explicit.
-   Ensure unsupported strategies cannot report successful repairs.
-   Improve source-location accuracy and rollback handling.

### Phase 2 --- Improve program understanding

-   Complete AST extraction.
-   Implement a real CFG builder.
-   Build symbol tables.
-   Extract function and class metadata.
-   Construct function dependency and reference graphs.

### Phase 3 --- Expand static analysis

-   Per-function complexity analysis.
-   Reachability and unreachable-code detection.
-   Dead-code analysis.
-   Improved duplicate detection.
-   Data-flow analysis.
-   Evidence correlation and stronger diagnosis.

### Phase 4 --- Improve repair safety

-   CFG-aware transformations.
-   Dependency-aware duplicate removal.
-   More precise source edits.
-   Explicit repair invariants.
-   Confidence-based abstention.

### Phase 5 --- Strengthen verification

-   Preserve and execute the original test suite.
-   Add behavioral regression checks.
-   Add stronger semantic validation.
-   Introduce OS-level sandbox isolation.
-   Implement transactional patch acceptance and rollback.

### Phase 6 --- Extend language support

-   Mature Python support first.
-   Add additional language adapters.
-   Reuse a common intermediate representation.
-   Explore JavaScript/TypeScript support.

## 11. Conclusion

Zenith establishes a modular foundation for deterministic,
evidence-driven code diagnosis and repair. It combines source parsing,
static-analysis tools, structured evidence and diagnosis models, repair
planning, selected AST transformations, and execution-based checks.

The next major step is to strengthen program understanding through
complete CFG generation and dependency analysis, then use that
information to make repairs safer and verification more meaningful.

**Zenith's guiding principle:**

> Understand the program. Diagnose the problem. Repair with evidence.
> Verify before accepting.
