import { SearchEngine, type SearchDocument, type SearchResult } from './search-engine';
import { PROTOTYPE_DOCUMENTS } from './prototype-model';

export type NodeId = 'N1' | 'N2' | 'N3' | 'N4';
export type ShardId = 0 | 1;
export type CopyRole = 'primary' | 'replica';
export type ClusterHealth = 'green' | 'yellow' | 'red';
export type ShardCopy = { shard: ShardId; node: NodeId; role: CopyRole; available: boolean };
export type SearchCandidate = { shard: ShardId; documentId: string; score: number };

export const INITIAL_COPIES: ShardCopy[] = [
  { shard: 0, node: 'N1', role: 'primary', available: true },
  { shard: 0, node: 'N3', role: 'replica', available: true },
  { shard: 1, node: 'N2', role: 'primary', available: true },
  { shard: 1, node: 'N1', role: 'replica', available: true },
];

export function illustrativeHash(documentId: string): number {
  const numeric = Number(documentId.match(/\d+$/)?.[0]);
  if (Number.isFinite(numeric)) return numeric ^ (numeric >> 1);
  return [...documentId].reduce((sum, character) => sum + character.codePointAt(0)!, 0);
}

export function routeDocument(documentId: string, shardCount = 2): ShardId {
  return (illustrativeHash(documentId) % shardCount) as ShardId;
}

export function documentsByShard(documents: SearchDocument[] = PROTOTYPE_DOCUMENTS) {
  return new Map<ShardId, SearchDocument[]>([
    [0, documents.filter((document) => routeDocument(document.id) === 0)],
    [1, documents.filter((document) => routeDocument(document.id) === 1)],
  ]);
}

export function selectSearchCopies(copies: ShardCopy[]): ShardCopy[] {
  return ([0, 1] as const).flatMap((shard) => {
    const eligible = copies.filter((copy) => copy.shard === shard && copy.available);
    const selected = eligible.find((copy) => copy.role === 'primary') ?? eligible[0];
    return selected ? [selected] : [];
  });
}

export function localCandidates(query = 'river', documents: SearchDocument[] = PROTOTYPE_DOCUMENTS): SearchCandidate[] {
  const shards = documentsByShard(documents);
  return ([0, 1] as const).flatMap((shard) => {
    const engine = new SearchEngine(shards.get(shard) ?? []);
    return engine.search(query).results.slice(0, 2).map((result) => ({ shard, documentId: result.document.id, score: result.score }));
  });
}

export function mergeCandidates(candidates: SearchCandidate[], size = 2): SearchCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score || a.documentId.localeCompare(b.documentId)).slice(0, size);
}

export function failNode(copies: ShardCopy[], node: NodeId): ShardCopy[] {
  return copies.map((copy) => copy.node === node ? { ...copy, available: false } : { ...copy });
}

export function promoteAvailableReplicas(copies: ShardCopy[]): ShardCopy[] {
  const next = copies.map((copy) => ({ ...copy }));
  for (const shard of [0, 1] as const) {
    const primary = next.find((copy) => copy.shard === shard && copy.role === 'primary');
    if (primary?.available) continue;
    const replica = next.find((copy) => copy.shard === shard && copy.role === 'replica' && copy.available);
    if (replica) replica.role = 'primary';
  }
  return next;
}

export function clusterHealth(copies: ShardCopy[]): ClusterHealth {
  for (const shard of [0, 1] as const) {
    if (!copies.some((copy) => copy.shard === shard && copy.role === 'primary' && copy.available)) return 'red';
  }
  return copies.some((copy) => copy.role === 'replica' && !copy.available) ? 'yellow' : 'green';
}

export function recoverOnReplacement(copies: ShardCopy[]): ShardCopy[] {
  const active = copies.filter((copy) => copy.available).map((copy) => ({ ...copy }));
  for (const shard of [0, 1] as const) {
    if (!active.some((copy) => copy.shard === shard && copy.role === 'replica')) {
      active.push({ shard, node: 'N4', role: 'replica', available: true });
    }
  }
  return active;
}

export function globalResults(query = 'river'): SearchResult[] {
  return new SearchEngine(PROTOTYPE_DOCUMENTS).search(query).results;
}
