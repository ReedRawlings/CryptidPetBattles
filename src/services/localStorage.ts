import type { RogueliteMetaState, RogueliteRunState, RogueliteGameState } from '../types';

const STORAGE_KEYS = {
  META: 'cpb_roguelite_meta',
  RUN: 'cpb_roguelite_run',
  FULL_STATE: 'cpb_roguelite_state',
  SCHEMA_VERSION: 'cpb_schema_version',
} as const;

const CURRENT_SCHEMA_VERSION = 3;

// ============================================================
// Save / Load Full State
// ============================================================

export function saveRogueliteState(state: RogueliteGameState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FULL_STATE, JSON.stringify(state));
    localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
  } catch (e) {
    console.error('Failed to save roguelite state:', e);
  }
}

export function loadRogueliteState(): RogueliteGameState | null {
  try {
    const version = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
    if (version && Number(version) !== CURRENT_SCHEMA_VERSION) {
      console.warn('Schema version mismatch, clearing saved state');
      clearRogueliteState();
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEYS.FULL_STATE);
    if (!raw) return null;

    return JSON.parse(raw) as RogueliteGameState;
  } catch (e) {
    console.error('Failed to load roguelite state:', e);
    return null;
  }
}

export function clearRogueliteState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.FULL_STATE);
    localStorage.removeItem(STORAGE_KEYS.META);
    localStorage.removeItem(STORAGE_KEYS.RUN);
  } catch (e) {
    console.error('Failed to clear roguelite state:', e);
  }
}

// ============================================================
// Save / Load Meta (roster, unlocks, breeding items)
// ============================================================

export function saveRogueliteMeta(meta: RogueliteMetaState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.META, JSON.stringify(meta));
  } catch (e) {
    console.error('Failed to save roguelite meta:', e);
  }
}

export function loadRogueliteMeta(): RogueliteMetaState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.META);
    if (!raw) return null;
    return JSON.parse(raw) as RogueliteMetaState;
  } catch (e) {
    console.error('Failed to load roguelite meta:', e);
    return null;
  }
}

// ============================================================
// Save / Load Run State (active run)
// ============================================================

export function saveRogueliteRun(run: RogueliteRunState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RUN, JSON.stringify(run));
  } catch (e) {
    console.error('Failed to save roguelite run:', e);
  }
}

export function loadRogueliteRun(): RogueliteRunState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RUN);
    if (!raw) return null;
    return JSON.parse(raw) as RogueliteRunState;
  } catch (e) {
    console.error('Failed to load roguelite run:', e);
    return null;
  }
}

export function clearRogueliteRun(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.RUN);
  } catch (e) {
    console.error('Failed to clear roguelite run:', e);
  }
}

/**
 * Check if there's a saved roguelite state (for "Continue" button).
 */
export function hasSavedRogueliteState(): boolean {
  return localStorage.getItem(STORAGE_KEYS.FULL_STATE) !== null;
}
