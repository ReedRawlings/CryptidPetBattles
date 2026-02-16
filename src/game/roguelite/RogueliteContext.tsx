import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { RogueliteGameState } from '../../types';
import { applyRogueliteAction, createInitialRogueliteState, type RogueliteAction } from './engine';
import { saveRogueliteState, loadRogueliteState } from '../../services/localStorage';

interface RogueliteContextValue {
  state: RogueliteGameState;
  dispatch: (action: RogueliteAction) => void;
}

const RogueliteContext = createContext<RogueliteContextValue | null>(null);

function rogueliteReducer(state: RogueliteGameState, action: RogueliteAction): RogueliteGameState {
  const result = applyRogueliteAction(state, action);
  if (!result.success) {
    console.warn('Roguelite action failed:', action.type, result.error);
    return state;
  }
  return result.state;
}

export function RogueliteProvider({ children }: { children: React.ReactNode }) {
  // Try to load saved state, fall back to fresh state
  const initialState = loadRogueliteState() ?? createInitialRogueliteState();
  const [state, rawDispatch] = useReducer(rogueliteReducer, initialState);

  // Auto-save on every state change
  useEffect(() => {
    saveRogueliteState(state);
  }, [state]);

  const dispatch = useCallback((action: RogueliteAction) => {
    rawDispatch(action);
  }, []);

  return (
    <RogueliteContext.Provider value={{ state, dispatch }}>
      {children}
    </RogueliteContext.Provider>
  );
}

export function useRoguelite(): RogueliteContextValue {
  const ctx = useContext(RogueliteContext);
  if (!ctx) throw new Error('useRoguelite must be used within RogueliteProvider');
  return ctx;
}
