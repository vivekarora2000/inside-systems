import { describe, expect, it } from 'vitest';
import { INITIAL_COPIES, clusterHealth, failNode, localCandidates, mergeCandidates, promoteAvailableReplicas, recoverOnReplacement, routeDocument, selectSearchCopies } from './cluster-simulation';

describe('illustrative cluster model', () => {
  it('keeps every primary and replica on different nodes', () => {
    for (const shard of [0, 1] as const) {
      const copies = INITIAL_COPIES.filter((copy) => copy.shard === shard);
      expect(new Set(copies.map((copy) => copy.node)).size).toBe(copies.length);
    }
  });

  it('routes documents deterministically across both shards', () => {
    expect([routeDocument('D1'), routeDocument('D2'), routeDocument('D3')]).toEqual([1, 1, 0]);
  });

  it('selects exactly one available copy per shard', () => {
    const selected = selectSearchCopies(INITIAL_COPIES);
    expect(selected).toHaveLength(2);
    expect(new Set(selected.map((copy) => copy.shard)).size).toBe(2);
  });

  it('merges implemented shard-local scores in descending order', () => {
    const merged = mergeCandidates(localCandidates());
    expect(merged.map((candidate) => candidate.documentId)).toEqual(['D1', 'D3']);
    expect(merged[0].score).toBeGreaterThanOrEqual(merged[1].score);
  });

  it('models failure with an available replica as yellow', () => {
    const promoted = promoteAvailableReplicas(failNode(INITIAL_COPIES, 'N1'));
    expect(promoted.find((copy) => copy.shard === 0 && copy.node === 'N3')?.role).toBe('primary');
    expect(clusterHealth(promoted)).toBe('yellow');
    expect(clusterHealth(recoverOnReplacement(promoted))).toBe('green');
  });

  it('models a shard without any available copy as red', () => {
    const bothUnavailable = failNode(failNode(INITIAL_COPIES, 'N1'), 'N3');
    expect(clusterHealth(promoteAvailableReplicas(bothUnavailable))).toBe('red');
  });
});
