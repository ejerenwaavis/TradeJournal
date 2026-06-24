/**
 * rules-registry.js — THE single source of truth for ML rule definitions
 *
 * This registry drives:
 *   ✅ UI rendering (what inputs to show in the ML Parameters panel)
 *   ✅ Write-time validation (rejects bad values before they hit the DB)
 *   ✅ CSV export (what columns to pull and how to format them)
 *
 * To add a new rule:  add one object to RULE_DEFINITIONS.
 * To remove a rule:   remove the object. Everything updates automatically.
 */

const CURRENT_SCHEMA_VERSION = 1;

const RULE_DEFINITIONS = [
  {
    id: 'org_dir',
    uiLabel: 'ORG Gap Direction',
    mlKey: 'ORG_Dir',
    dataType: 'categorical',
    allowedValues: [1, -1],
    exportAs: 'number',
    uiMapping: {
      'Bullish': 1,
      'Bearish': -1,
    },
    description: 'Bullish = 1, Bearish = -1',
    required: false,
  },
  {
    id: 'org_gap_size',
    uiLabel: 'ORG Gap Handle Size',
    mlKey: 'ORG_Gap_Size',
    dataType: 'numeric',
    allowedValues: null,
    exportAs: 'number',
    uiMapping: null,
    description: 'Exact handle size as decimal',
    required: false,
  },
  {
    id: 'judas_peak_sd',
    uiLabel: 'Judas Swing Peak (SD)',
    mlKey: 'Judas_Peak_SD',
    dataType: 'numeric',
    allowedValues: null,
    exportAs: 'number',
    uiMapping: null,
    description: 'Standard-deviation level of the Judas swing peak',
    required: false,
  },
  {
    id: 'peak_time',
    uiLabel: 'Peak Formation Time',
    mlKey: 'Peak_Time',
    dataType: 'time',
    allowedValues: null,
    exportAs: 'string',
    uiMapping: null,
    description: 'HH:MM timestamp of the peak formation',
    required: false,
  },
  {
    id: 'macro_sync',
    uiLabel: 'Macro Window Sync',
    mlKey: 'Macro_Sync',
    dataType: 'boolean',
    allowedValues: [0, 1],
    exportAs: 'number',
    uiMapping: {
      'Inside Window': 1,
      'Outside/Chopped': 0,
    },
    description: 'Inside Window (09:50-10:10) = 1, else = 0',
    required: false,
  },
  {
    id: 'htf_anchor',
    uiLabel: 'HTF Anchor / PD Array',
    mlKey: 'HTF_Anchor',
    dataType: 'categorical',
    allowedValues: null, // Free-text categorical (e.g., "1H FVG", "4H OB")
    exportAs: 'string',
    uiMapping: null,
    description: 'Higher-timeframe PD array anchor (e.g., 1H FVG, 4H OB)',
    required: false,
  },
  {
    id: 'org_confluence',
    uiLabel: 'ORG Confluence Score',
    mlKey: 'ORG_Confluence',
    dataType: 'numeric',
    allowedValues: null,
    exportAs: 'number',
    uiMapping: null,
    description: 'Numeric confluence score for the ORG setup',
    required: false,
  },
  {
    id: 'displacement',
    uiLabel: 'Displacement Validation',
    mlKey: 'Displacement_Valid',
    dataType: 'boolean',
    allowedValues: [0, 1],
    exportAs: 'number',
    uiMapping: {
      'Clean': 1,
      'Yes': 1,
      'Chopped': 0,
      'No': 0,
    },
    description: 'Clean displacement = 1, Chopped/absent = 0',
    required: false,
  },
  {
    id: 'mae_handles',
    uiLabel: 'MAE (Handles)',
    mlKey: 'MAE_Handles',
    dataType: 'numeric',
    allowedValues: null,
    exportAs: 'number',
    uiMapping: null,
    description: 'Maximum Adverse Excursion in handles',
    required: false,
  },
  {
    id: 'mfe_handles',
    uiLabel: 'MFE (Handles)',
    mlKey: 'MFE_Handles',
    dataType: 'numeric',
    allowedValues: null,
    exportAs: 'number',
    uiMapping: null,
    description: 'Maximum Favorable Excursion in handles',
    required: false,
  },
  {
    id: 'session_outcome_r',
    uiLabel: 'Session Outcome (R)',
    mlKey: 'Session_Outcome_R',
    dataType: 'numeric',
    allowedValues: null,
    exportAs: 'number',
    uiMapping: null,
    description: 'Session outcome measured in R-multiples',
    required: false,
  },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Get a rule definition by its stable id */
function getRuleById(id) {
  return RULE_DEFINITIONS.find(r => r.id === id) || null;
}

/** Get a rule definition by its ML export key */
function getRuleByMlKey(mlKey) {
  return RULE_DEFINITIONS.find(r => r.mlKey === mlKey) || null;
}

/** Get all ML keys in registry order */
function getAllMlKeys() {
  return RULE_DEFINITIONS.map(r => r.mlKey);
}

module.exports = {
  RULE_DEFINITIONS,
  CURRENT_SCHEMA_VERSION,
  getRuleById,
  getRuleByMlKey,
  getAllMlKeys,
};
