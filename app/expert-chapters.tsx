'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { INITIAL_COPIES, clusterHealth, failNode, localCandidates, mergeCandidates, promoteAvailableReplicas, recoverOnReplacement, routeDocument, selectSearchCopies } from './cluster-simulation';
import { INITIAL_TOUR_STATE, PROTOTYPE_DOCUMENTS, TOUR_STEPS, tourReducer } from './prototype-model';
import { SearchEngine } from './search-engine';

export const EXPERT_CHAPTERS = [
  ['ranking', 'Ranking'],
  ['mapping', 'Mappings'],
  ['query-dsl', 'Query DSL'],
  ['shards', 'Shards and routing'],
  ['distributed', 'Distributed search'],
  ['segments', 'Refresh and segments'],
  ['aggregations', 'Aggregations'],
  ['failure', 'Failure and recovery'],
  ['lifecycle', 'Lifecycle and snapshots'],
  ['performance', 'Performance and sizing'],
  ['security', 'Security'],
  ['practice', 'Expert practice'],
] as const;
export type ExpertChapterId = (typeof EXPERT_CHAPTERS)[number][0];
export type ChapterId = 'index' | ExpertChapterId;

type Lesson = { label: string; title: string; narration: string; detail: string };
const LESSONS: Record<ExpertChapterId, Lesson[]> = {
  ranking: [
    { label: 'RANKING · 01', title: 'Why does one match rank above another?', narration: 'Both documents contain “river,” so matching alone cannot decide their order.', detail: 'The executable model scores title and body fields independently with BM25, then adds their weighted contributions.' },
    { label: 'RANKING · 02', title: 'Rare terms carry more information', narration: 'Document frequency becomes IDF: terms found in fewer documents contribute more.', detail: 'For this collection, river appears in two of three documents. The displayed IDF comes directly from the engine explanation.' },
    { label: 'RANKING · 03', title: 'Repeated terms have diminishing returns', narration: 'Term frequency helps, but BM25 deliberately gives each extra repetition less influence.', detail: 'Both matches contain river once, so term frequency does not separate them in this example.' },
    { label: 'RANKING · 04', title: 'Document length changes the comparison', narration: 'A match in a shorter field can be more concentrated than the same match in a longer field.', detail: 'Move the normalization control. The bars recalculate through the real engine; no score is fabricated in the interface.' },
    { label: 'RANKING · 05', title: 'The explanation should add up', narration: 'Every visible contribution sums to the final score and the results follow that order.', detail: 'This project uses a weighted sum of per-field BM25 scores. It is not presented as Elasticsearch’s exact default multi-field behavior.' },
  ],
  mapping: [
    { label: 'DATA MODELING · 01', title: 'A document is a collection of typed fields', narration: 'Before indexing, decide what each field means and how people will use it.', detail: 'Mappings are the schema for an index. They control field types and related indexing behavior.' },
    { label: 'DATA MODELING · 02', title: 'Text and keyword solve different problems', narration: 'Use text for analyzed full-text search and keyword for exact values, sorting, and buckets.', detail: 'A common multi-field pattern indexes one logical value both as text and as a keyword subfield.' },
    { label: 'DATA MODELING · 03', title: 'Dates, numbers, and locations need real types', narration: 'Correct types unlock range queries, date math, numerical metrics, and geo operations.', detail: 'Sending everything as strings loses type-specific behavior and can create difficult migrations.' },
    { label: 'DATA MODELING · 04', title: 'Dynamic mapping is convenient, not a design strategy', narration: 'Unexpected field names can grow the mapping and consume cluster resources.', detail: 'Dynamic can be true, runtime, false, or strict. Explicit templates make repeated field patterns predictable.' },
    { label: 'DATA MODELING · 05', title: 'Mappings are easiest to fix before ingestion', narration: 'Design a new index, reindex, validate, then switch an alias when a field type must change.', detail: 'Many mapping changes cannot rewrite already-indexed values in place. Plan migrations and rollback paths.' },
  ],
  'query-dsl': [
    { label: 'QUERY DSL · 01', title: 'A search request is a tree of clauses', narration: 'Leaf queries match fields; compound queries combine those decisions.', detail: 'Query DSL is the foundational JSON query language. Other interfaces may compose multi-stage retrieval or analytics.' },
    { label: 'QUERY DSL · 02', title: 'Match analyzes text; term expects an exact value', narration: 'Choose the query that agrees with the field mapping and the user’s intent.', detail: 'A match query analyzes its input. A term query is generally used for exact values such as keyword fields.' },
    { label: 'QUERY DSL · 03', title: 'Must and should can affect score', narration: 'Required clauses narrow the result set; optional matches can improve relevance.', detail: 'In a bool query, must clauses are required and score, while should clauses are optional or controlled by minimum_should_match.' },
    { label: 'QUERY DSL · 04', title: 'Filters answer yes or no', narration: 'Use filter context for exact constraints that should not influence relevance.', detail: 'Filter and must_not clauses do not contribute to score and may be cached.' },
    { label: 'QUERY DSL · 05', title: 'Keep query trees understandable', narration: 'Name important clauses, profile slow requests, and avoid nesting that obscures intent.', detail: 'Expert query work starts with a hypothesis, representative judgments, and measurement—not random boosts.' },
  ],
  shards: [
    { label: 'DISTRIBUTION · 01', title: 'An index is divided into primary shards', narration: 'Each primary shard owns a subset of the documents in the index.', detail: 'This lesson uses two shards for clarity. Production shard counts should be chosen from workload and recovery requirements.' },
    { label: 'DISTRIBUTION · 02', title: 'Shard copies live on nodes', narration: 'A node is a running Elasticsearch instance that can hold multiple shard copies.', detail: 'Shard identity and node identity are different. A shard may move while remaining the same logical shard.' },
    { label: 'DISTRIBUTION · 03', title: 'Replicas provide another copy', narration: 'The model places each replica on a different node from its primary.', detail: 'Replicas improve availability and can serve searches. They are not a substitute for off-cluster snapshots.' },
    { label: 'DISTRIBUTION · 04', title: 'Routing chooses one primary shard', narration: 'D3 follows a deterministic teaching hash to shard 0, then reaches its primary copy.', detail: `The illustrative function routes D3 to shard ${routeDocument('D3')}. It does not reproduce Elasticsearch’s routing hash.` },
    { label: 'DISTRIBUTION · 05', title: 'The write is copied to the replica', narration: 'After the primary applies the modeled write, the document is copied to the replica.', detail: 'This browser model omits translog, durability, in-sync allocation IDs, retry, and acknowledgement details.' },
  ],
  distributed: [
    { label: 'DISTRIBUTED SEARCH · 01', title: 'Any eligible node can coordinate a request', narration: 'For this request, N2 accepts the query and becomes the coordinator.', detail: 'Coordinator is a role for a request, not necessarily a permanently dedicated node.' },
    { label: 'DISTRIBUTED SEARCH · 02', title: 'Choose one copy of each relevant shard', narration: 'The coordinator selects one available copy of shard 0 and one of shard 1—not every replica.', detail: 'Elasticsearch can use adaptive replica selection. This deterministic lesson prefers available primaries.' },
    { label: 'DISTRIBUTED SEARCH · 03', title: 'Each shard finds its local candidates', narration: 'The query runs against the selected shard copies and each returns local top matches.', detail: 'This simulation creates a real SearchEngine per shard, so its local statistics can differ.' },
    { label: 'DISTRIBUTED SEARCH · 04', title: 'The coordinator merges the candidates', narration: 'N2 compares shard-local candidates and selects the global top results for this model.', detail: 'Production Elasticsearch has additional scoring and execution details. The browser merge uses the displayed local scores.' },
    { label: 'DISTRIBUTED SEARCH · 05', title: 'Fetch only the winning documents', narration: 'The coordinator fetches the selected documents, assembles the response, and returns it.', detail: 'Query then fetch avoids transferring every matching document to the coordinator.' },
  ],
  segments: [
    { label: 'INDEXING · 01', title: 'An acknowledged write is not the same as a searchable document', narration: 'Indexing and search visibility are separate parts of the lifecycle.', detail: 'This is an explanatory state model. It does not simulate translog durability or every indexing buffer detail.' },
    { label: 'INDEXING · 02', title: 'A refresh makes recent changes searchable', narration: 'Refresh opens a new searchable segment without waiting for a full durable flush.', detail: 'Refresh and flush are different operations. Do not use the terms interchangeably.' },
    { label: 'INDEXING · 03', title: 'A shard searches multiple immutable segments', narration: 'New searchable segments accumulate as indexing continues.', detail: 'Lucene segments are immutable. Deletes are tracked and later reclaimed during merges.' },
    { label: 'INDEXING · 04', title: 'Merges combine smaller segments', narration: 'Background merges create fewer, larger segments and reclaim deleted documents.', detail: 'Merging consumes CPU, disk I/O, and temporary disk space. It is not free maintenance.' },
    { label: 'INDEXING · 05', title: 'Visibility settings are workload tradeoffs', narration: 'Batch indexing, refresh frequency, and query latency must be tuned together.', detail: 'Forcing refreshes can create many tiny segments. Measure the end-to-end workload before changing defaults.' },
  ],
  aggregations: [
    { label: 'AGGREGATIONS · 01', title: 'Search can return answers beyond documents', narration: 'Aggregations summarize the matching set into buckets and metrics.', detail: 'The query chooses which documents participate; aggregations analyze that result set.' },
    { label: 'AGGREGATIONS · 02', title: 'Bucket aggregations group documents', narration: 'A terms aggregation can group matching documents by an exact-value field.', detail: 'Use keyword or other aggregatable field types. Aggregating analyzed text is usually not the intended model.' },
    { label: 'AGGREGATIONS · 03', title: 'Metric aggregations calculate values', narration: 'Within each bucket, metrics can count, sum, average, or find extrema.', detail: 'Metrics can be nested under buckets to answer questions such as average latency per service.' },
    { label: 'AGGREGATIONS · 04', title: 'Nested aggregation trees answer layered questions', narration: 'Each level narrows the context for the calculations below it.', detail: 'Deep, high-cardinality trees can be expensive. Limit scope and validate memory behavior.' },
    { label: 'AGGREGATIONS · 05', title: 'Approximation and pagination matter at scale', narration: 'Experts inspect error bounds, bucket limits, and use composite pagination when needed.', detail: 'Distributed aggregation accuracy depends on the aggregation and collection strategy; do not assume every displayed count is exact.' },
  ],
  failure: [
    { label: 'RESILIENCE · 01', title: 'Start with every shard copy available', narration: 'Both primaries and both replicas are available, so the modeled cluster is green.', detail: 'Green means every configured primary and replica shard is allocated.' },
    { label: 'RESILIENCE · 02', title: 'A node stops responding', narration: 'N1 disappears. Its shard copies become unavailable while other nodes remain active.', detail: 'Detection is shown as an explicit simulated time step; it is not instantaneous.' },
    { label: 'RESILIENCE · 03', title: 'An available replica can be promoted', narration: 'The replica of shard 0 on N3 becomes the modeled primary.', detail: 'The simulation omits master election, allocation deciders, and the real promotion protocol.' },
    { label: 'RESILIENCE · 04', title: 'Primary data remains available, but redundancy is reduced', narration: 'All primaries are available, yet a replica is missing, so health is yellow—not red.', detail: 'Red means at least one primary shard is unavailable. A node failure does not automatically imply red health.' },
    { label: 'RESILIENCE · 05', title: 'A replacement restores redundancy over time', narration: 'N4 receives replacement replicas and the modeled cluster returns to green.', detail: 'Recovery uses network and disk resources. Production recovery is not instantaneous.' },
  ],
  lifecycle: [
    { label: 'OPERATIONS · 01', title: 'Time-series data moves through a lifecycle', narration: 'Fresh data receives frequent writes; older data is usually read less often.', detail: 'Data streams provide a named abstraction over backing indices for append-only time-series data.' },
    { label: 'OPERATIONS · 02', title: 'Rollover starts a new write index', narration: 'A size, age, or document threshold can move writes to a new backing index.', detail: 'Rollover conditions should align with shard sizing and retention goals.' },
    { label: 'OPERATIONS · 03', title: 'Lifecycle phases change cost and behavior', narration: 'Hot, warm, cold, frozen, and delete phases express an operational policy.', detail: 'Available phases and actions depend on deployment type. Serverless uses data stream lifecycle rather than ILM.' },
    { label: 'OPERATIONS · 04', title: 'Snapshots store recovery data outside the cluster', narration: 'A repository preserves shard segments and selected cluster state away from the live nodes.', detail: 'Replicas help availability; snapshots protect against deletion, corruption, and wider failures.' },
    { label: 'OPERATIONS · 05', title: 'Recovery must be rehearsed', narration: 'A backup is useful only when its repository, permissions, capacity, and restore procedure are tested.', detail: 'Snapshots represent shard data captured across a start-to-end interval, not one cluster-wide instant.' },
  ],
  performance: [
    { label: 'PERFORMANCE · 01', title: 'Start with a representative workload', narration: 'Use production-shaped documents, queries, hardware, concurrency, and growth assumptions.', detail: 'There is no universal cluster size. Benchmark the workload you actually need to operate.' },
    { label: 'PERFORMANCE · 02', title: 'Too many tiny shards create overhead', narration: 'Every shard and segment consumes coordination, memory, and search resources.', detail: 'Searching many small shards can cost much more than searching the same data in fewer appropriately sized shards.' },
    { label: 'PERFORMANCE · 03', title: 'Very large shards recover slowly', narration: 'Shard size is a balance between overhead, parallelism, relocation time, and failure recovery.', detail: 'Elastic documents 10–50 GB as a useful general starting range, not a universal target.' },
    { label: 'PERFORMANCE · 04', title: 'Measure latency, throughput, saturation, and errors together', narration: 'A fast median can hide slow tails, queueing, rejections, or unstable memory use.', detail: 'Observe search and write thread pools, heap pressure, garbage collection, disk, cache behavior, and shard allocation.' },
    { label: 'PERFORMANCE · 05', title: 'Change one bottleneck at a time', narration: 'Profile, form a hypothesis, test under load, and keep the result only when evidence improves.', detail: 'Scaling hardware cannot repair an unbounded query, mapping explosion, or pathological shard strategy.' },
  ],
  security: [
    { label: 'SECURITY · 01', title: 'Every request needs an authenticated identity', narration: 'Users, applications, and automation should use distinct credentials.', detail: 'Avoid sharing high-privilege credentials across services or people.' },
    { label: 'SECURITY · 02', title: 'Roles grant only the privileges required', narration: 'Cluster and index privileges should follow least privilege.', detail: 'Separate read, write, monitoring, lifecycle, snapshot, and administration responsibilities.' },
    { label: 'SECURITY · 03', title: 'Index scope matters as much as the action', narration: 'A role should name the data it can access, not grant broad wildcard access by habit.', detail: 'Use field- and document-level security where the deployment and use case require finer boundaries.' },
    { label: 'SECURITY · 04', title: 'Transport and HTTP traffic must be protected', narration: 'TLS, certificate validation, and secret rotation are operational fundamentals.', detail: 'Keep credentials out of source, URLs, logs, and browser-delivered code.' },
    { label: 'SECURITY · 05', title: 'Audit and recovery are part of the security design', narration: 'Monitor privileged actions, test access loss recovery, and protect snapshot repositories.', detail: 'Security includes prevention, detection, response, and restoration—not only authentication.' },
  ],
  practice: [
    { label: 'EXPERT PRACTICE · 01', title: 'Explain the mechanism before tuning it', narration: 'Trace one document in and one query out until every transformation is defensible.', detail: 'If you cannot explain a token, posting, candidate, score, shard, or response, inspect it before changing settings.' },
    { label: 'EXPERT PRACTICE · 02', title: 'Build relevance judgments', narration: 'Collect representative queries and label which results are good, acceptable, and wrong.', detail: 'Use judgments to compare analyzers, queries, boosts, and reranking with repeatable metrics.' },
    { label: 'EXPERT PRACTICE · 03', title: 'Practice failure on a safe cluster', narration: 'Stop nodes, lose a replica, block allocation, fill a disk, and restore a snapshot.', detail: 'Game days turn written assumptions into observable recovery behavior.' },
    { label: 'EXPERT PRACTICE · 04', title: 'Read the APIs and inspect evidence', narration: 'Use mappings, settings, explain, profile, tasks, cat APIs, and cluster allocation explanations.', detail: 'Experts diagnose from state and measurements rather than relying on a single dashboard color.' },
    { label: 'EXPERT PRACTICE · 05', title: 'Operate a complete feedback loop', narration: 'Design, measure, explain, test failure, document the decision, and repeat.', detail: 'Expertise is the ability to make reliable tradeoffs under a real workload—not memorizing every setting.' },
  ],
};

function ClusterNodes({ step, mode }: { step: number; mode: 'shards' | 'distributed' | 'failure' }) {
  const failed = mode === 'failure' && step >= 1;
  const recovered = mode === 'failure' && step >= 4;
  const selected = selectSearchCopies(INITIAL_COPIES);
  const copies = mode === 'failure' ? (recovered ? recoverOnReplacement(promoteAvailableReplicas(failNode(INITIAL_COPIES, 'N1'))) : promoteAvailableReplicas(failNode(INITIAL_COPIES, 'N1'))) : INITIAL_COPIES;
  return <div className={`cluster-diagram cluster-${mode} cluster-step-${step}`}>
    {(['N1', 'N2', 'N3'] as const).map((node) => <div className={`cluster-node ${node === 'N1' && failed ? 'node-down' : ''}`} key={node}><b>{node}</b>{INITIAL_COPIES.filter((copy) => copy.node === node).map((copy) => {
      const current = copies.find((item) => item.shard === copy.shard && item.node === node);
      const isSelected = mode === 'distributed' && step >= 1 && selected.some((item) => item.shard === copy.shard && item.node === node);
      return <span className={`shard-chip ${current?.role === 'primary' ? 'primary' : 'replica'} ${isSelected ? 'selected-copy' : ''} ${!current?.available ? 'copy-down' : ''}`} key={`${copy.shard}-${copy.role}`}>{current?.role === 'primary' ? 'P' : 'R'}{copy.shard}</span>;
    })}</div>)}
    {recovered && <div className="cluster-node replacement"><b>N4</b><span className="shard-chip replica">R1</span></div>}
    {mode === 'shards' && step >= 3 && <div className="route-message">D3 → hash → S0</div>}
    {mode === 'distributed' && step >= 2 && <><div className="search-message message-left">query: river</div><div className="search-message message-right">query: river</div></>}
    {mode === 'distributed' && step >= 3 && <div className="candidate-merge">{localCandidates().map((candidate) => <span key={candidate.documentId}>S{candidate.shard}: {candidate.documentId} · {candidate.score.toFixed(3)}</span>)}</div>}
    {mode === 'failure' && step >= 3 && <div className={`health health-${recovered ? 'green' : clusterHealth(copies)}`}>{recovered ? 'green' : clusterHealth(copies)}</div>}
  </div>;
}

function RankingDiagram({ step, b, setB }: { step: number; b: number; setB: (value: number) => void }) {
  const response = useMemo(() => new SearchEngine(PROTOTYPE_DOCUMENTS).search('river', { b, titleWeight: 1 }), [b]);
  const results = response.results;
  const max = Math.max(...results.map((result) => result.score), 1);
  const idf = results[0]?.explanation.contributions[0]?.idf ?? 0;
  return <div className="ranking-diagram">
    <div className="ranking-facts"><span>query <code>river</code></span>{step >= 1 && <span>df <code>2 / 3</code> · idf <code>{idf.toFixed(3)}</code></span>}{step >= 2 && <span>tf <code>1</code> in both matches</span>}</div>
    <div className="rank-bars">{results.map((result, index) => <div className="rank-row" key={result.document.id}><code>{step >= 4 ? `${index + 1}. ` : ''}{result.document.id}</code><div><i style={{ width: `${result.score / max * 100}%` }} /></div><output>{result.score.toFixed(3)}</output><small>{result.explanation.contributions.find((item) => item.field === 'body')?.documentLength} indexed terms</small></div>)}</div>
    {step >= 3 && <label className="inline-control">Length normalization <output>{b.toFixed(2)}</output><input type="range" min="0" max="1" step="0.05" value={b} onChange={(event) => setB(Number(event.target.value))} /></label>}
  </div>;
}

function ConceptDiagram({ chapter, step }: { chapter: ExpertChapterId; step: number }) {
  if (chapter === 'mapping') return <div className="mapping-diagram"><pre>{`{\n  "title": "River walk",\n  "status": "published",\n  "opened": "2026-11-08",\n  "visits": 184\n}`}</pre><div className="mapping-arrow">→</div><div className="mapping-fields"><span><code>title</code><b>{step >= 1 ? 'text + keyword' : 'field'}</b></span><span><code>status</code><b>{step >= 1 ? 'keyword' : 'field'}</b></span><span><code>opened</code><b>{step >= 2 ? 'date' : 'field'}</b></span><span><code>visits</code><b>{step >= 2 ? 'long' : 'field'}</b></span>{step >= 3 && <em>dynamic fields need a policy</em>}{step >= 4 && <strong>new index → reindex → alias switch</strong>}</div></div>;
  if (chapter === 'query-dsl') return <div className="query-tree"><div className="query-root">bool</div><div className={`query-clause ${step >= 2 ? 'active' : ''}`}><code>must</code><span>match title: river</span></div><div className={`query-clause ${step >= 2 ? 'active' : ''}`}><code>should</code><span>match body: park</span></div><div className={`query-clause ${step >= 3 ? 'filter-active' : ''}`}><code>filter</code><span>term status: published</span></div><div className={`query-clause ${step >= 3 ? 'filter-active' : ''}`}><code>must_not</code><span>term hidden: true</span></div>{step >= 4 && <div className="query-result">named clauses · profile · measure</div>}</div>;
  if (chapter === 'segments') return <div className="segment-diagram"><div className="indexing-buffer">recent writes{step >= 1 && <span>refresh</span>}</div><div className="segment-arrow">→</div><div className="segments">{Array.from({ length: step < 2 ? 1 : step < 3 ? 4 : 2 }, (_, index) => <span className={step >= 3 ? 'merged' : ''} key={index}>segment {index + 1}</span>)}</div>{step >= 4 && <div className="tradeoff-scale"><span>index throughput</span><i /><span>search visibility</span></div>}</div>;
  if (chapter === 'aggregations') return <div className="aggregation-diagram"><div className="agg-docs">{['park', 'river', 'park', 'café', 'river', 'park'].map((category, index) => <span key={index}>{category}</span>)}</div><div className="agg-arrow">→</div><div className="buckets">{[['park', 3], ['river', 2], ['café', 1]].map(([name, count]) => <div key={name}><i style={{ height: `${Number(count) * 48}px` }} /><code>{name}</code><b>{count}</b>{step >= 2 && <small>avg metric</small>}</div>)}</div>{step >= 3 && <div className="agg-tree">query → bucket → metric{step >= 4 && ' → inspect error / paginate'}</div>}</div>;
  if (chapter === 'lifecycle') return <div className="lifecycle-diagram"><div className="phase-track">{['hot', 'warm', 'cold', 'frozen', 'delete'].map((phase, index) => <span className={step >= Math.min(index + 1, 3) ? 'active' : ''} key={phase}>{phase}</span>)}</div>{step >= 1 && <div className="rollover-note">write index 000001 → 000002</div>}{step >= 3 && <div className="snapshot-repository">snapshot repository<br /><code>off-cluster segments</code></div>}{step >= 4 && <div className="restore-arrow">restore rehearsal ↺</div>}</div>;
  if (chapter === 'performance') return <div className="performance-diagram"><div className="workload-box">representative workload</div><div className="shard-scale"><span className={step >= 1 ? 'warn' : ''}>many tiny shards</span><i /><span className={step >= 2 ? 'warn' : ''}>very large shards</span></div>{step >= 3 && <div className="four-signals"><span>latency p95</span><span>throughput</span><span>saturation</span><span>errors</span></div>}{step >= 4 && <div className="measure-loop">profile → hypothesize → load test → compare</div>}</div>;
  if (chapter === 'security') return <div className="security-diagram"><div className="identity">application A</div><div className="security-arrow">authenticated as</div><div className="role-box"><b>search_reader</b>{step >= 1 && <code>read</code>}{step >= 2 && <code>parks-*</code>}</div><div className="security-arrow">→</div><div className="protected-index">parks-2026</div>{step >= 3 && <div className="tls-line">TLS · rotated secret</div>}{step >= 4 && <div className="audit-line">audit · recover · review</div>}</div>;
  return <div className="practice-diagram">{['Explain', 'Measure', 'Test failure', 'Inspect evidence', 'Document and repeat'].map((item, index) => <div className={step >= index ? 'active' : ''} key={item}><span>{index + 1}</span>{item}</div>)}</div>;
}

function ChapterMenu({ current, onNavigate }: { current: ChapterId; onNavigate: (chapter: ChapterId) => void }) {
  return <details className="chapter-menu"><summary>Chapters</summary><nav aria-label="Chapters"><button className={current === 'index' ? 'current' : ''} onClick={() => onNavigate('index')}>Documents and the index</button>{EXPERT_CHAPTERS.map(([id, label]) => <button className={current === id ? 'current' : ''} onClick={() => onNavigate(id)} key={id}>{label}</button>)}</nav></details>;
}

export function ExpertChapter({ chapter, onNavigate, onExit }: { chapter: ExpertChapterId; onNavigate: (chapter: ChapterId) => void; onExit?: () => void }) {
  const [tour, dispatch] = useReducer(tourReducer, INITIAL_TOUR_STATE);
  const [b, setB] = useState(.75);
  const lessons = LESSONS[chapter];
  const lesson = lessons[tour.step];

  useEffect(() => {
    if (!tour.playing) return;
    const revision = tour.revision;
    const timer = window.setTimeout(() => { if (revision === tour.revision) dispatch({ type: 'NEXT' }); }, 3000);
    return () => window.clearTimeout(timer);
  }, [tour.playing, tour.revision, tour.step]);

  function visual() {
    if (chapter === 'ranking') return <RankingDiagram step={tour.step} b={b} setB={(value) => { setB(value); dispatch({ type: 'EDIT' }); }} />;
    if (chapter === 'shards' || chapter === 'distributed' || chapter === 'failure') return <ClusterNodes step={tour.step} mode={chapter} />;
    return <ConceptDiagram chapter={chapter} step={tour.step} />;
  }

  const index = EXPERT_CHAPTERS.findIndex(([id]) => id === chapter);
  const nextChapter = EXPERT_CHAPTERS[index + 1]?.[0];
  const copiesAfterFailure = promoteAvailableReplicas(failNode(INITIAL_COPIES, 'N1'));
  const candidates = mergeCandidates(localCandidates());

  return <main className="textbook-shell expert-shell">
    <header className="site-header"><button className="home-link" onClick={onExit ?? (() => onNavigate('index'))}>Inside Systems</button><div className="header-links"><ChapterMenu current={chapter} onNavigate={onNavigate} /><button popoverTarget="about-expert">About</button></div></header>
    <article className="lesson-page" id="lesson">
      <header className="lesson-heading"><p>{lesson.label}</p><h1>{lesson.title}</h1></header>
      <figure className={`diagram expert-diagram expert-${chapter} expert-step-${tour.step}`}>{visual()}<figcaption className="sr-only">{lesson.narration}</figcaption></figure>
      <section className="narration" aria-live="polite"><p>{lesson.narration}</p><details className="lesson-details"><summary>Show details</summary><p>{lesson.detail}</p>{chapter === 'distributed' && tour.step >= 3 && <p>{candidates.map((candidate) => <code key={candidate.documentId}>S{candidate.shard} {candidate.documentId} {candidate.score.toFixed(3)}</code>)}</p>}{chapter === 'failure' && tour.step >= 3 && <p><code>health {clusterHealth(copiesAfterFailure)}</code></p>}</details></section>
      <div className="playback" aria-label="Lesson playback controls"><button onClick={() => dispatch({ type: 'PREVIOUS' })} disabled={tour.step === 0}>Previous</button><button className="play-button" onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}>{tour.playing ? 'Pause' : 'Play'}</button><span>{tour.step + 1} / {TOUR_STEPS.length}</span><button onClick={() => dispatch({ type: 'NEXT' })} disabled={tour.step === 4}>Next</button><button className="restart-button" onClick={() => dispatch({ type: 'RESTART' })}>Restart</button></div>
      {tour.step === 4 && <div className="continue-row">{nextChapter ? <button onClick={() => onNavigate(nextChapter)}>Continue to {EXPERT_CHAPTERS[index + 1][1]} <span>→</span></button> : <button onClick={() => onNavigate('index')}>Return to the beginning <span>↺</span></button>}</div>}
    </article>
    <footer><button popoverTarget="sources-expert">Model assumptions and sources</button></footer>
    <aside id="about-expert" popover="auto" className="text-popover"><button className="close" popoverTarget="about-expert" popoverTargetAction="hide">Close</button><h2>Inside Systems</h2><p>A guided curriculum from analysis and ranking through distributed execution, operations, security, and expert practice.</p></aside>
    <aside id="sources-expert" popover="auto" className="text-popover"><button className="close" popoverTarget="sources-expert" popoverTargetAction="hide">Close</button><h2>Model assumptions and sources</h2><p>Search scores and shard-local candidates are executable. Cluster, lifecycle, performance, and security diagrams are deliberately simplified explanatory models.</p><p><a href="https://www.elastic.co/docs">Elastic documentation</a><br /><a href="https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query">Bool query reference</a><br /><a href="https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards">Shard sizing guidance</a><br /><a href="https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore">Snapshot and restore</a></p></aside>
  </main>;
}
