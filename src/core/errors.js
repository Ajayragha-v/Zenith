/**
 * Zenith Detective - Custom Error Hierarchy
 *
 * Provides domain-specific error classes for schema validation,
 * interface enforcement, JSON parsing, and reference resolution.
 */

export class ZenithError extends Error {
  /**
   * @param {string} message - Human-readable error description.
   * @param {object} [options] - Additional error options including cause.
   */
  constructor(message, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export class ValidationError extends ZenithError {
  /**
   * @param {string} message - Validation failure summary.
   * @param {Array<object>} issues - Formatted Zod validation issues.
   * @param {string} [schemaName] - Name of the schema that failed.
   */
  constructor(message, issues = [], schemaName = 'UnknownSchema') {
    super(message);
    this.issues = issues;
    this.schemaName = schemaName;
  }

  /**
   * Formats Zod errors into an actionable message.
   * @param {import('zod').ZodError} zodError
   * @param {string} schemaName
   * @returns {ValidationError}
   */
  static fromZodError(zodError, schemaName = 'UnknownSchema') {
    const issues = zodError.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const detailString = issues
      .map((i) => `  - [${i.path || '<root>'}]: ${i.message}`)
      .join('\n');

    const message = `Validation failed for schema "${schemaName}":\n${detailString}`;
    return new ValidationError(message, issues, schemaName);
  }
}

export class JsonParseError extends ZenithError {
  /**
   * @param {string} message - Error message.
   * @param {object} [options] - Additional options such as raw input context.
   */
  constructor(message, options = {}) {
    super(message, options);
    this.context = options.context || null;
  }
}

export class JsonWriteError extends ZenithError {
  /**
   * @param {string} message - Error message.
   * @param {string} filePath - Path to file that failed to write.
   * @param {object} [options] - Additional options.
   */
  constructor(message, filePath, options = {}) {
    super(message, options);
    this.filePath = filePath;
  }
}

export class InterfaceContractError extends ZenithError {
  /**
   * @param {string} message - Interface contract violation message.
   * @param {string} [methodName] - Name of the method or contract property violated.
   */
  constructor(message, methodName = '') {
    super(message);
    this.methodName = methodName;
  }
}

export class ReferenceResolutionError extends ZenithError {
  /**
   * @param {string} message - Description of unresolved reference.
   * @param {string} referenceId - Identifier that failed to resolve.
   * @param {string} targetType - Type of target referenced (e.g. 'Evidence').
   */
  constructor(message, referenceId, targetType = 'Evidence') {
    super(message);
    this.referenceId = referenceId;
    this.targetType = targetType;
  }
}
