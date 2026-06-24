/**
 * validate-parameters.js — Write-time validation for ML parameters
 *
 * This runs when the user hits Save, NOT when they hit Export.
 * Bad values like "IOFED" are rejected at the door.
 */

const { RULE_DEFINITIONS, getRuleByMlKey } = require('./rules-registry');

/**
 * Validate and normalize a single ML parameter value.
 *
 * @param {string} mlKey   - The ML key (e.g., "Displacement_Valid")
 * @param {*}      rawValue - The raw value from the client
 * @returns {{ valid: boolean, mlValue?: *, error?: string }}
 */
function validateAndNormalize(mlKey, rawValue) {
  const def = getRuleByMlKey(mlKey);
  if (!def) {
    return { valid: false, error: `Unknown ML parameter: ${mlKey}` };
  }

  // Allow explicit null / empty to clear a value
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    if (def.required) {
      return { valid: false, error: `${def.uiLabel} (${mlKey}) is required` };
    }
    return { valid: true, mlValue: null };
  }

  let mlValue = rawValue;

  // Step 1: Apply UI-to-ML mapping if one exists
  if (def.uiMapping && typeof rawValue === 'string') {
    const mapped = def.uiMapping[rawValue];
    if (mapped !== undefined) {
      mlValue = mapped;
    }
    // If the raw string isn't in uiMapping, fall through to type coercion
    // (user may have typed the numeric value directly)
  }

  // Step 2: Type coercion based on exportAs
  if (def.exportAs === 'number') {
    if (typeof mlValue === 'string') {
      mlValue = mlValue.trim();
    }
    const parsed = parseFloat(mlValue);
    if (isNaN(parsed)) {
      const mappingHint = def.uiMapping
        ? ` Accepted values: ${Object.keys(def.uiMapping).join(', ')}`
        : '';
      return {
        valid: false,
        error: `"${rawValue}" is not a valid number for ${def.uiLabel} (${mlKey}).${mappingHint}`,
      };
    }
    mlValue = parsed;
  } else if (def.exportAs === 'string') {
    mlValue = String(mlValue).trim();
    if (!mlValue) {
      if (def.required) {
        return { valid: false, error: `${def.uiLabel} (${mlKey}) is required` };
      }
      return { valid: true, mlValue: null };
    }
  }

  // Step 3: Check allowed values
  if (def.allowedValues && !def.allowedValues.includes(mlValue)) {
    return {
      valid: false,
      error: `${mlValue} is not in the allowed values [${def.allowedValues.join(', ')}] for ${def.uiLabel} (${mlKey})`,
    };
  }

  return { valid: true, mlValue };
}

/**
 * Validate and normalize an entire mlParameters object.
 *
 * @param {Object} params - { mlKey: rawValue, ... }
 * @returns {{ valid: boolean, normalized: Object, errors: string[] }}
 */
function validateAllParameters(params) {
  if (!params || typeof params !== 'object') {
    return { valid: true, normalized: {}, errors: [] };
  }

  const normalized = {};
  const errors = [];

  // Validate each provided parameter
  for (const [mlKey, rawValue] of Object.entries(params)) {
    const result = validateAndNormalize(mlKey, rawValue);
    if (!result.valid) {
      errors.push(result.error);
    } else if (result.mlValue !== null) {
      normalized[mlKey] = result.mlValue;
    }
    // null values are omitted from normalized (keep the object clean)
  }

  // Check for required parameters that are missing
  RULE_DEFINITIONS.forEach(def => {
    if (def.required && normalized[def.mlKey] === undefined) {
      errors.push(`${def.uiLabel} (${def.mlKey}) is required`);
    }
  });

  return {
    valid: errors.length === 0,
    normalized,
    errors,
  };
}

module.exports = {
  validateAndNormalize,
  validateAllParameters,
};
