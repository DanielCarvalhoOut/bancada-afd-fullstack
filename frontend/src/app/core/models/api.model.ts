import { AutomatonModel, AutomatonKind, Determinization } from '../../domain/automaton';

export type {
  AutomatonModel, AutomatonState, AutomatonTransition, AutomatonKind, Determinization,
  Subset, DetRow, NfaRun, NfaStep,
} from '../../domain/automaton';

/** Autômato salvo na biblioteca (retorno da API). */
export interface SavedAutomaton {
  id: string;
  name: string;
  kind: AutomatonKind;
  stateCount: number;
  model: AutomatonModel;
  createdAt: string;
  updatedAt: string;
}

export type { Determinization as DeterminizationResult };
