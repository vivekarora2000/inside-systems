import { describe, expect, it } from 'vitest';
import { EXPERIMENTS, ORIGINAL_CORPUS } from './corpus';
import { analyze, SearchEngine, type SearchDocument } from './search-engine';

const tinyCorpus: SearchDocument[] = [
  { id: 'a', title: 'Alpha harbor', category: 'Test', body: 'Common alpha alpha.' },
  { id: 'b', title: 'Beta market', category: 'Test', body: 'Common beta.' },
  { id: 'c', title: '', category: 'Test', body: '' },
];

describe('analysis', () => {
  it('uses the same normalized tokens and preserves original offsets', () => {
    const source = 'The CAFÉ—opens!';
    const analysis = analyze(source, true);
    expect(analysis.allTokens.map((token) => token.term)).toEqual(['the', 'café', 'opens']);
    expect(analysis.tokens.map((token) => token.term)).toEqual(['café', 'opens']);
    expect(analysis.removedTokens.map((token) => token.term)).toEqual(['the']);
    expect(source.slice(analysis.tokens[0].start, analysis.tokens[0].end)).toBe('CAFÉ');

    const engine = new SearchEngine([{ id: 'cafe', title: source, category: 'Test', body: '' }]);
    expect(engine.search('café').results[0].document.id).toBe('cafe');
  });
});

describe('index construction', () => {
  it('stores per-field frequencies, positions, and document frequency', () => {
    const engine = new SearchEngine(tinyCorpus);
    expect(engine.getPostings('alpha')).toEqual([
      { documentId: 'a', title: { tf: 1, positions: [0] }, body: { tf: 2, positions: [1, 2] } },
    ]);
    expect(engine.getStats().documentFrequencies.common).toBe(2);
    expect(engine.getStats().documentLengths.a).toEqual({ title: 2, body: 3 });
  });
});

describe('BM25 retrieval and scoring', () => {
  it('matches a hand-calculated one-term BM25 score', () => {
    const engine = new SearchEngine([
      { id: 'a', title: 'alpha', category: 'Test', body: '' },
      { id: 'b', title: 'beta', category: 'Test', body: '' },
    ]);
    const result = engine.search('alpha', { titleWeight: 2, k1: 1.2, b: 0.75 }).results[0];
    expect(result.score).toBeCloseTo(2 * Math.log(2), 10);
    expect(result.explanation.contributions[0].idf).toBeCloseTo(Math.log(2), 10);
  });

  it('supports OR and AND matching', () => {
    const engine = new SearchEngine(tinyCorpus);
    expect(engine.search('alpha beta', { matchMode: 'OR' }).results.map((result) => result.document.id)).toEqual(['a', 'b']);
    expect(engine.search('alpha beta', { matchMode: 'AND' }).results).toHaveLength(0);
  });

  it('applies title and body weights independently', () => {
    const engine = new SearchEngine([
      { id: 'title', title: 'signal', category: 'Test', body: '' },
      { id: 'body', title: '', category: 'Test', body: 'signal' },
    ]);
    const neutral = engine.search('signal', { titleWeight: 1 });
    const weighted = engine.search('signal', { titleWeight: 3 });
    expect(neutral.results[0].score).toBeCloseTo(neutral.results[1].score, 10);
    expect(weighted.results[0].document.id).toBe('title');
    expect(weighted.results[0].score).toBeCloseTo(weighted.results[1].score * 3, 10);
  });

  it('returns explanations whose contributions sum exactly to the score', () => {
    const engine = new SearchEngine(tinyCorpus);
    for (const result of engine.search('alpha common').results) {
      const sum = result.explanation.contributions.reduce((total, item) => total + item.contribution, 0);
      expect(sum).toBeCloseTo(result.score, 12);
      expect(result.explanation.titleScore + result.explanation.bodyScore).toBeCloseTo(result.score, 12);
    }
  });
});

describe('mutations, ties, and edge cases', () => {
  it('reindexes after edits and deletions', () => {
    const engine = new SearchEngine(tinyCorpus);
    engine.upsertDocument({ id: 'a', title: 'Gamma', category: 'Test', body: '' });
    expect(engine.search('alpha').results).toHaveLength(0);
    expect(engine.search('gamma').results[0].document.id).toBe('a');
    expect(engine.deleteDocument('a')).toBe(true);
    expect(engine.getPostings('gamma')).toHaveLength(0);
    expect(engine.getStats().corpusSize).toBe(2);
  });

  it('breaks ties by document ID and never returns invalid scores', () => {
    const engine = new SearchEngine([
      { id: 'z', title: 'same', category: 'Test', body: '' },
      { id: 'a', title: 'same', category: 'Test', body: '' },
      { id: 'empty', title: '', category: 'Test', body: '' },
    ]);
    expect(engine.search('same').results.map((result) => result.document.id)).toEqual(['a', 'z']);
    expect(engine.search('').results).toHaveLength(0);
    expect(engine.search('the and').results).toHaveLength(0);
    expect(engine.search('missing').results).toHaveLength(0);
    expect(engine.search('same').results.every((result) => Number.isFinite(result.score))).toBe(true);
  });

  it('offers explicit typo suggestions without rewriting', () => {
    const engine = new SearchEngine(ORIGINAL_CORPUS);
    const response = engine.search('fery');
    expect(response.query).toBe('fery');
    expect(response.results).toHaveLength(0);
    expect(response.suggestions.fery).toContain('ferry');
  });
});

describe('curated experiments', () => {
  it('rare terms produce a larger IDF than common terms', () => {
    const experiment = EXPERIMENTS.find((item) => item.id === 'rare-words')!;
    const engine = new SearchEngine(ORIGINAL_CORPUS);
    const result = engine.search(experiment.query, experiment.settings).results.find((item) => item.document.id === 'zephyrite-archive')!;
    const zephyrite = result.explanation.contributions.find((item) => item.term === 'zephyrite')!;
    const harbor = result.explanation.contributions.find((item) => item.term === 'harbor')!;
    expect(zephyrite.df).toBe(1);
    expect(zephyrite.idf).toBeGreaterThan(harbor.idf);
  });

  it('raising title weight increases the headline document’s lead', () => {
    const engine = new SearchEngine(ORIGINAL_CORPUS);
    const low = engine.search('rooftop cinema', { titleWeight: 0.5, matchMode: 'AND' });
    const high = engine.search('rooftop cinema', { titleWeight: 4, matchMode: 'AND' });
    const lowGap = low.results.find((item) => item.document.id === 'rooftop-headline')!.score - low.results.find((item) => item.document.id === 'rooftop-body')!.score;
    const highGap = high.results.find((item) => item.document.id === 'rooftop-headline')!.score - high.results.find((item) => item.document.id === 'rooftop-body')!.score;
    expect(highGap).toBeGreaterThan(lowGap);
  });
});
