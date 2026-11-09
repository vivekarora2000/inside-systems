import { analyze, DEFAULT_SETTINGS, SearchEngine, type SearchDocument, type SearchSettings } from './search-engine';

export const PROTOTYPE_DOCUMENTS: SearchDocument[] = [
  { id: 'D1', title: 'D1', category: 'Lesson', body: 'The river runs beside the park.' },
  { id: 'D2', title: 'D2', category: 'Lesson', body: 'The park has a stone bridge.' },
  { id: 'D3', title: 'D3', category: 'Lesson', body: 'The café overlooks the river.' },
];

export const TOUR_STEPS = ['document', 'analysis', 'index', 'query', 'ranking'] as const;
export type TourState = { step: number; playing: boolean; revision: number };
export type TourAction = { type: 'NEXT' | 'PREVIOUS' | 'RESTART' | 'TOGGLE_PLAY' | 'EDIT' } | { type: 'GOTO'; step: number };
export const INITIAL_TOUR_STATE: TourState = { step: 0, playing: false, revision: 0 };

export function tourReducer(state: TourState, action: TourAction): TourState {
  if (action.type === 'EDIT') return { ...state, playing: false, revision: state.revision + 1 };
  if (action.type === 'RESTART') return { step: 0, playing: false, revision: state.revision + 1 };
  if (action.type === 'TOGGLE_PLAY') return state.step === TOUR_STEPS.length - 1 ? { ...state, step: 0, playing: true } : { ...state, playing: !state.playing };
  if (action.type === 'NEXT') {
    const step = Math.min(TOUR_STEPS.length - 1, state.step + 1);
    return { ...state, step, playing: state.playing && step < TOUR_STEPS.length - 1 };
  }
  if (action.type === 'PREVIOUS') return { ...state, step: Math.max(0, state.step - 1), playing: false };
  if (action.type === 'GOTO') return { ...state, step: Math.max(0, Math.min(TOUR_STEPS.length - 1, action.step)), playing: false };
  return state;
}

export function buildPrototype(sentence: string, query: string, settings: Partial<SearchSettings> = {}) {
  const documents = PROTOTYPE_DOCUMENTS.map((document, index) => index === 0 ? { ...document, body: sentence } : document);
  const engine = new SearchEngine(documents);
  return { documents, engine, analysis: analyze(sentence), response: engine.search(query, { ...DEFAULT_SETTINGS, ...settings }) };
}
