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

The selected chapter is preserved in the URL. The larger fictional corpus and original engine experiments remain in `app/corpus.ts` for later bounded playground work.

## Executable behavior

`app/search-engine.ts` is a pure TypeScript search engine. It tokenizes Unicode text, normalizes with NFKC and lowercase matching, applies a fixed stop-word list, preserves offsets, builds per-field posting lists, retrieves with OR or AND matching, and returns structured BM25 explanations.

The implemented score is:

```text
score(d,q) = titleWeight × BM25_title(d,q) + BM25_body(d,q)
```

`app/cluster-simulation.ts` is a deterministic teaching model. It implements:

- an explicitly illustrative document-routing hash;
- primary/replica placement on separate nodes;
- one selected available copy per shard;
- real shard-local search-engine scoring;
- deterministic candidate merging;
- modeled node failure, replica promotion, cluster health, and replacement recovery.

Tests verify score arithmetic, index construction, playback restoration and cancellation, shard-copy separation, search-copy selection, merge order, replica promotion, and green/yellow/red health behavior.

## Important limitations

- This is not Elasticsearch running in the browser.
- Analysis depends on the configured analyzer in a real cluster.
- The browser cluster omits real routing hashes, translog and durability behavior, in-sync allocation IDs, master election, allocation deciders, adaptive replica selection, retry behavior, and recovery timing.
- Shard-local scoring is implemented, but production Elasticsearch has additional distributed search behavior.
- Refresh, merge, aggregation, lifecycle, performance, and security chapters are explanatory models rather than emulated Elasticsearch nodes.
- The weighted title/body score is this project’s model and is not described as Elasticsearch’s exact default multi-field combination.
- Cassandra diagrams are explanatory models, not an emulated Cassandra cluster. Token values, vnode layouts, replica selection, Paxos, repair, and streaming are simplified for teaching.

## Official documentation consulted

Implementation and lesson copy were checked against current Elastic documentation on 2026-11-08:

- [Text analysis](https://www.elastic.co/docs/manage-data/data-store/text-analysis)
- [Index fundamentals](https://www.elastic.co/docs/manage-data/data-store/index-basics)
- [Dynamic field mapping](https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-field-mapping)
- [Query DSL bool query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query)
- [Match query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query)
- [Search shard routing](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-shard-routing)
- [Refresh parameter](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/refresh-parameter)
- [Merge resource limits](https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/merge-settings)
- [Index lifecycle management](https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management)
- [Snapshot and restore](https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore)
- [Shard sizing guidance](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards)
- [Security privileges](https://www.elastic.co/docs/reference/elasticsearch/security-privileges)
- [Apache Cassandra architecture](https://cassandra.apache.org/doc/stable/cassandra/architecture/overview.html)
- [Apache Cassandra data modeling](https://cassandra.apache.org/doc/stable/cassandra/developing/data-modeling/intro.html)
- [CQL data definition and primary keys](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html)
- [Apache Cassandra storage engine](https://cassandra.apache.org/doc/stable/cassandra/architecture/storage-engine.html)
- [Apache Cassandra compaction](https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compaction/overview.html)

## Project structure

- `app/search-engine.ts`: executable analysis, indexing, retrieval, and ranking.
- `app/cluster-simulation.ts`: deterministic illustrative cluster state.
- `app/prototype-model.ts`: three-document lesson data and playback reducer.
- `app/inside-elasticsearch.tsx`: approved inverted-index lesson and chapter routing.
- `app/expert-chapters.tsx`: the expert curriculum and contextual diagrams.
- `app/cassandra-course.tsx`: the Cassandra curriculum and animated diagrams.
- `app/database-hub.tsx`: database selection and URL routing.
- `app/corpus.ts`: preserved 48-document playground corpus.

## Deploy to `inside-systems.aroravivek.com`

The app is configured as a static export. `npm run build` generates ordinary HTML, CSS, and JavaScript in `out/`. The included GitHub Actions workflow deploys that folder to GitHub Pages whenever `main` changes.

After pushing the repository:

1. Open the repository’s **Settings → Pages** and select **GitHub Actions** as the source.
2. In the DNS settings for `aroravivek.com`, create a CNAME record:
   - Name/host: `inside-systems`
   - Target/value: `vivekarora2000.github.io`
3. In **Settings → Pages**, confirm the custom domain is `inside-systems.aroravivek.com` and enable HTTPS after DNS verification succeeds.

The committed `public/CNAME` file preserves the custom domain in each static deployment.
