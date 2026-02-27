import { VoiceCandidate } from '../domain/intents';

export type DisambiguationState = {
  draft: string;
  candidates: VoiceCandidate[];
  loading: boolean;
};

export type DisambiguationAction =
  | { type: 'SET_DRAFT'; draft: string }
  | { type: 'RESOLVE_START' }
  | { type: 'RESOLVE_DONE'; candidates: VoiceCandidate[] }
  | { type: 'RESET' };

export const initialDisambiguationState: DisambiguationState = {
  draft: '',
  candidates: [],
  loading: false
};

export function disambiguationReducer(
  state: DisambiguationState,
  action: DisambiguationAction
): DisambiguationState {
  switch (action.type) {
    case 'SET_DRAFT':
      return { ...state, draft: action.draft };
    case 'RESOLVE_START':
      return { ...state, loading: true };
    case 'RESOLVE_DONE':
      return { ...state, loading: false, candidates: action.candidates.slice(0, 3) };
    case 'RESET':
      return initialDisambiguationState;
    default:
      return state;
  }
}
