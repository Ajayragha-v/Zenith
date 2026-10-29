/**
 * Zenith Detective
 * Multi-language code-analysis and root-cause diagnosis engine
 *
 * Step 1: Project Foundation & Contracts
 */

// Common contracts
export {
  SchemaVersionSchema,
  TimestampSchema,
  MetadataSchema,
  SourceLocationSchema,
  ProjectMetadataSchema,
  ToolExecutionResultSchema,
} from './schemas/common.js';

// ProgramModel contracts
export {
  ParserDiagnosticSchema,
  FileStatusSchema,
  ImportNodeSchema,
  FileNodeSchema,
  ParameterSchema,
  FunctionNodeSchema,
  ClassNodeSchema,
  SymbolNodeSchema,
  ControlFlowEdgeSchema,
  ControlFlowBlockSchema,
  ControlFlowGraphSchema,
  ProgramModelSchema,
} from './schemas/program-model.js';

// Evidence contracts
export {
  EvidenceCategorySchema,
  EvidenceSeveritySchema,
  EvidenceSchema,
  EvidenceCollectionSchema,
} from './schemas/evidence.js';

// IR contracts
export {
  IRStatusSchema,
  ReproductionSchema,
  DiagnosisSchema,
  IRSchema,
} from './schemas/ir.js';

// Core engine & adapters
export {
  LanguageAdapter,
  MockLanguageAdapter,
} from './core/language-adapter.js';

// Custom errors
export {
  ZenithError,
  ValidationError,
  JsonParseError,
  JsonWriteError,
  InterfaceContractError,
  ReferenceResolutionError,
} from './core/errors.js';

// Utilities
export {
  parseJsonSafely,
  validateSchema,
  serializeJson,
  readJsonFile,
  writeJsonFileSafely,
} from './utils/json.js';
