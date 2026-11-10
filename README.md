# Inside Systems

Inside Systems is an animated textbook for learning Elasticsearch and Apache Cassandra from first principles through production operations. A restrained landing page opens either field guide; every chapter is a five-step animated explanation.

## Run it

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Verification: `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`.

## Elasticsearch curriculum

Each chapter is a five-step guided lesson with stable Previous, Play/Pause, Next, and Restart controls:

1. Documents, analysis, inverted indexing, lookup, and matching.
2. BM25 intuition and executable score explanations.
3. Mappings, field types, dynamic mapping, and reindex migrations.
4. Query DSL, match versus term, bool clauses, and filter context.
5. Primary shards, replica placement, routing, and modeled replication.
6. Coordinator behavior, one selected copy per shard, local candidates, merge, and fetch.
7. Refresh, immutable segments, merging, and visibility tradeoffs.
8. Bucket and metric aggregations, nesting, accuracy, and pagination.
9. Node failure, replica promotion, health states, and recovery.
10. Data streams, rollover, lifecycle phases, snapshots, and restore rehearsal.
11. Workload design, shard sizing, observability, and evidence-driven tuning.
12. Authentication, least privilege, data scope, transport protection, and auditing.
13. Relevance judgments, failure practice, diagnostic APIs, and an expert feedback loop.

## Cassandra curriculum

1. Peer architecture, coordination, token ownership, replication, and the LSM storage engine.
2. Query-first data modeling, denormalization, bucketing, and partition estimates.
3. Partition and clustering keys, sort order, and bounded slice queries.
4. Murmur3 tokens, the ring, token-aware routing, streaming, and skew.
5. Replication factor, topology, last-write-wins mutations, hints, and backups.
6. ONE, QUORUM, LOCAL_QUORUM, overlap, failure semantics, and tradeoff testing.
7. Coordinator, commit log, memtable, SSTable flush, and background write debt.
8. Replica selection, Bloom filters, indexes, SSTables, and reconciliation.
9. Immutable history, compaction strategies, tombstones, and compaction debt.
10. Divergence, Merkle comparison, streaming, repair cadence, and verification.
11. Paxos-backed lightweight transactions, serial consistency, and contention.
12. Service signals, background work, capacity headroom, security, and recovery.
13. Access-pattern review, tracing, failure drills, debt measurement, and expert practice.
