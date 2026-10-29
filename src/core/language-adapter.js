/**
 * Zenith Detective - LanguageAdapter Abstract Contract
 *
 * Defines the unified interface all language-specific adapters (Python, TypeScript, etc.)
 * must implement to plug into the Zenith pipeline.
 */

import { InterfaceContractError } from './errors.js';
import { ProgramModelSchema } from '../schemas/program-model.js';
import { validateSchema } from '../utils/json.js';

/**
 * Metadata descriptor for a language supported by an adapter.
 * @typedef {object} LanguageInfo
 * @property {string} id - Unique language identifier (e.g. 'python', 'typescript').
 * @property {string} name - Human-readable language name.
 * @property {string[]} fileExtensions - Associated file extensions (e.g. ['.py']).
 * @property {string[]} [manifestFiles] - Manifest or lockfiles (e.g. ['pyproject.toml', 'requirements.txt']).
 */

/**
 * Abstract Base Class for Language Adapters.
 */
export class LanguageAdapter {
  constructor() {
    if (new.target === LanguageAdapter) {
      throw new InterfaceContractError(
        'LanguageAdapter is an abstract class and cannot be instantiated directly.'
      );
    }
  }

  /**
   * Return metadata describing the language capabilities.
   * @returns {LanguageInfo}
   */
  getLanguageInfo() {
    throw new InterfaceContractError(
      `Class "${this.constructor.name}" must implement getLanguageInfo().`,
      'getLanguageInfo'
    );
  }

  /**
   * Determine if the target project path is handled by this adapter.
   * @param {string} projectPath - Path to target project directory.
   * @returns {Promise<{ matches: boolean, confidence: number, reason?: string }>}
   */
  async detectProject(projectPath) {
    throw new InterfaceContractError(
      `Class "${this.constructor.name}" must implement detectProject(projectPath).`,
      'detectProject'
    );
  }

  /**
   * Parse target project and build a valid ProgramModel.
   * @param {string} projectPath - Path to target project directory.
   * @param {object} [options] - Parsing and traversal options.
   * @returns {Promise<import('zod').infer<typeof ProgramModelSchema>>}
   */
  async parseProject(projectPath, options = {}) {
    throw new InterfaceContractError(
      `Class "${this.constructor.name}" must implement parseProject(projectPath, options).`,
      'parseProject'
    );
  }

  /**
   * Validate that an object adheres to the shared ProgramModel contract.
   * @param {unknown} modelData
   * @returns {import('zod').infer<typeof ProgramModelSchema>}
   */
  validateProgramModel(modelData) {
    return validateSchema(modelData, ProgramModelSchema, 'ProgramModel');
  }
}

/**
 * Test double adapter used to verify interface conformance in tests.
 */
export class MockLanguageAdapter extends LanguageAdapter {
  constructor(options = {}) {
    super();
    this._info = options.info || {
      id: 'mock-lang',
      name: 'Mock Language',
      fileExtensions: ['.mock'],
      manifestFiles: ['mock.json'],
    };
    this._detectionResult = options.detectionResult ?? {
      matches: true,
      confidence: 1.0,
      reason: 'Mock match',
    };
    this._parseResult = options.parseResult ?? null;
  }

  getLanguageInfo() {
    return this._info;
  }

  async detectProject(projectPath) {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new TypeError('projectPath must be a non-empty string');
    }
    return this._detectionResult;
  }

  async parseProject(projectPath, options = {}) {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new TypeError('projectPath must be a non-empty string');
    }
    if (!this._parseResult) {
      throw new Error('MockLanguageAdapter: no parseResult configured.');
    }
    return this.validateProgramModel(this._parseResult);
  }
}
