/**
 * Zenith Detective - JSON & Schema Utilities
 *
 * Robust, safe JSON operations with schema validation and safe filesystem persistence.
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  JsonParseError,
  JsonWriteError,
  ValidationError,
  ZenithError,
} from '../core/errors.js';

/**
 * Safely parse a JSON string with informative error reporting.
 * @param {string} jsonString - The raw JSON string.
 * @param {string} [context=''] - Description of source or context for debugging.
 * @returns {unknown} Parsed JavaScript value.
 * @throws {TypeError} If jsonString is not a string.
 * @throws {JsonParseError} If parsing fails.
 */
export function parseJsonSafely(jsonString, context = '') {
  if (typeof jsonString !== 'string') {
    throw new TypeError(
      `parseJsonSafely expected a string, received ${typeof jsonString}${context ? ` in ${context}` : ''}`
    );
  }

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    const contextPrefix = context ? `[${context}] ` : '';
    throw new JsonParseError(
      `${contextPrefix}Failed to parse JSON: ${err.message}`,
      { cause: err, context }
    );
  }
}

/**
 * Validate arbitrary data against a Zod schema.
 * @template T
 * @param {unknown} data - Data to validate.
 * @param {import('zod').ZodSchema<T>} schema - Zod schema.
 * @param {string} [schemaName='Schema'] - Name of schema for error reporting.
 * @returns {T} Validated and typed data.
 * @throws {ValidationError} If validation fails.
 */
export function validateSchema(data, schema, schemaName = 'Schema') {
  if (!schema || typeof schema.safeParse !== 'function') {
    throw new TypeError('validateSchema requires a valid Zod schema instance.');
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    throw ValidationError.fromZodError(result.error, schemaName);
  }

  return result.data;
}

/**
 * Safely serialize data to formatted JSON string.
 * @param {unknown} data - Data to serialize.
 * @param {number|string} [indent=2] - Indentation spacing.
 * @returns {string} Formatted JSON string.
 */
export function serializeJson(data, indent = 2) {
  try {
    return JSON.stringify(data, null, indent);
  } catch (err) {
    throw new ZenithError(`Failed to serialize data to JSON: ${err.message}`, {
      cause: err,
    });
  }
}

/**
 * Safely read a JSON file and optionally validate against a schema.
 * @param {string} filePath - Path to JSON file.
 * @param {import('zod').ZodSchema} [schema] - Optional schema to validate.
 * @param {string} [schemaName] - Schema name for errors.
 * @returns {Promise<unknown>} Parsed (and validated) content.
 */
export async function readJsonFile(filePath, schema = null, schemaName = 'Schema') {
  let content;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    throw new ZenithError(`Cannot read JSON file at "${filePath}": ${err.message}`, {
      cause: err,
    });
  }

  const data = parseJsonSafely(content, filePath);
  if (schema) {
    return validateSchema(data, schema, schemaName);
  }
  return data;
}

/**
 * Safely write data to a JSON file without silently overwriting unrelated files.
 * @param {string} filePath - Target file path.
 * @param {unknown} data - Data to write.
 * @param {object} [options]
 * @param {boolean} [options.overwrite=false] - Whether to allow overwriting existing files.
 * @param {number|string} [options.indent=2] - JSON indentation.
 * @param {import('zod').ZodSchema} [options.schema] - Optional schema to validate prior to writing.
 * @param {string} [options.schemaName] - Name of schema for error reporting.
 * @param {boolean} [options.atomic=true] - Whether to perform atomic write via temp file.
 * @returns {Promise<string>} Resolved absolute file path.
 */
export async function writeJsonFileSafely(filePath, data, options = {}) {
  const {
    overwrite = false,
    indent = 2,
    schema = null,
    schemaName = 'Schema',
    atomic = true,
  } = options;

  const resolvedPath = path.resolve(filePath);

  // Validate before writing if schema provided
  const validatedData = schema ? validateSchema(data, schema, schemaName) : data;
  const jsonContent = serializeJson(validatedData, indent);

  // Guard against accidental overwrites
  if (!overwrite && existsSync(resolvedPath)) {
    throw new JsonWriteError(
      `Refusing to overwrite existing file at "${resolvedPath}". Set options.overwrite = true to permit.`,
      resolvedPath
    );
  }

  const dir = path.dirname(resolvedPath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    throw new JsonWriteError(
      `Failed to create directory "${dir}": ${err.message}`,
      resolvedPath,
      { cause: err }
    );
  }

  if (atomic) {
    const tempFile = path.join(
      dir,
      `.tmp-${path.basename(resolvedPath)}-${crypto.randomBytes(6).toString('hex')}`
    );
    try {
      await fs.writeFile(tempFile, jsonContent, 'utf-8');
      await fs.rename(tempFile, resolvedPath);
    } catch (err) {
      // Clean up temp file if present
      try {
        if (existsSync(tempFile)) {
          await fs.unlink(tempFile);
        }
      } catch {
        // ignore cleanup error
      }
      throw new JsonWriteError(
        `Failed to write JSON atomically to "${resolvedPath}": ${err.message}`,
        resolvedPath,
        { cause: err }
      );
    }
  } else {
    try {
      await fs.writeFile(resolvedPath, jsonContent, 'utf-8');
    } catch (err) {
      throw new JsonWriteError(
        `Failed to write JSON to "${resolvedPath}": ${err.message}`,
        resolvedPath,
        { cause: err }
      );
    }
  }

  return resolvedPath;
}
