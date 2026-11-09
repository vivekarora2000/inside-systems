import { describe, expect, it } from 'vitest';
import { INITIAL_TOUR_STATE, tourReducer } from './prototype-model';
import { buildPrototype } from './prototype-model';

describe('guided tour playback', () => {
  it('restores exact prior and restart states', () => {
    const atTwo = tourReducer(tourReducer(INITIAL_TOUR_STATE, { type: 'NEXT' }), { type: 'NEXT' });
    expect(tourReducer(atTwo, { type: 'PREVIOUS' })).toEqual({ step: 1, playing: false, revision: 0 });
    expect(tourReducer(atTwo, { type: 'RESTART' })).toEqual({ step: 0, playing: false, revision: 1 });
  });

  it('cancels playback and invalidates obsolete progress after an edit', () => {
    const playing = tourReducer(INITIAL_TOUR_STATE, { type: 'TOGGLE_PLAY' });
    const edited = tourReducer(playing, { type: 'EDIT' });
    expect(edited).toEqual({ step: 0, playing: false, revision: 1 });
  });
});

describe('inverted-index lesson data', () => {
  it('derives the displayed postings and results from the executable engine', () => {
    const model = buildPrototype('The river runs beside the park.', 'river');
    expect(model.engine.getPostings('river').map((posting) => posting.documentId)).toEqual(['D1', 'D3']);
    expect(model.engine.getPostings('park').map((posting) => posting.documentId)).toEqual(['D1', 'D2']);
    expect(model.engine.getPostings('bridge').map((posting) => posting.documentId)).toEqual(['D2']);
    expect(model.response.results.map((result) => result.document.id)).toEqual(['D3', 'D1']);
  });
});
