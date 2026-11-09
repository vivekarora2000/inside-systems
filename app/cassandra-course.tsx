'use client';

import { useEffect, useReducer, useState } from 'react';
import { INITIAL_TOUR_STATE, TOUR_STEPS, tourReducer } from './prototype-model';

const CASSANDRA_CHAPTERS = [
  ['architecture', 'Architecture'], ['modeling', 'Query-first modeling'], ['primary-keys', 'Primary keys'], ['ring', 'Tokens and the ring'], ['replication', 'Replication'], ['consistency', 'Tunable consistency'], ['write-path', 'Write path'], ['read-path', 'Read path'], ['compaction', 'SSTables and compaction'], ['repair', 'Repair and tombstones'], ['lwt', 'Lightweight transactions'], ['operations', 'Operations and security'], ['practice', 'Expert practice'],
] as const;
type CassandraChapter = (typeof CASSANDRA_CHAPTERS)[number][0];
type Lesson = { title: string; narration: string; detail: string };
const item = (title: string, narration: string, detail: string): Lesson => ({ title, narration, detail });

const LESSONS: Record<CassandraChapter, Lesson[]> = {
  architecture: [
    item('Every node can coordinate a request', 'Clients can connect to any available node; that node coordinates the work for the request.', 'Cassandra has no permanent primary node for ordinary reads and writes. Ownership is determined per partition.'),
    item('The cluster is a partitioned key space', 'A hash maps each partition key into a token range owned by nodes.', 'Modern Cassandra commonly uses virtual nodes, so each physical node owns multiple token ranges.'),
    item('Copies cross failure boundaries', 'Replication places additional copies according to the keyspace strategy and topology.', 'NetworkTopologyStrategy is designed for multi-datacenter and rack-aware placement.'),
    item('Availability is a negotiated tradeoff', 'The requested consistency level decides how many replicas must acknowledge.', 'Availability depends on the replica count, consistency level, and which replicas are reachable.'),
    item('The local engine is an LSM tree', 'Fast append-oriented writes become immutable SSTables that are merged in the background.', 'The distributed architecture and the storage engine must be reasoned about together.'),
  ],
  modeling: [
    item('Start with the queries, not the entities', 'List the exact reads the application must serve before designing tables.', 'Cassandra data models are query-driven because joins and arbitrary cross-partition scans are not the normal access path.'),
    item('One table can serve one access pattern', 'Shape the partition and clustering columns around a bounded query.', 'A domain entity may be duplicated into several tables, each optimized for a different query.'),
    item('Denormalization buys predictable reads', 'Writing the same fact to multiple tables avoids runtime joins.', 'Duplication moves work to the write path and requires application-level decisions about update coordination.'),
    item('Bound every partition', 'Add a bucket such as day or month when one logical key could grow without limit.', 'Partition size, row count, and mutation rate all matter; there is no universally safe bucket size.'),
    item('Validate with real cardinalities', 'Estimate rows, bytes, and requests per partition before traffic arrives.', 'Good modeling connects business growth assumptions to partition size and access frequency.'),
  ],
  'primary-keys': [
    item('The primary key has two jobs', 'The partition key chooses placement; clustering columns organize rows inside that partition.', 'PRIMARY KEY ((partition columns), clustering columns) makes those responsibilities explicit.'),
    item('Partition columns are hashed together', 'All rows with the same partition key are stored and retrieved as one logical partition.', 'Composite partition keys help distribute data using more than one business attribute.'),
    item('Clustering columns sort on disk', 'Rows inside a partition follow clustering order, enabling efficient slices.', 'Restriction order should follow the declared clustering hierarchy.'),
    item('A key should answer a known query', 'The query supplies the partition key and then narrows a contiguous clustering range.', 'ALLOW FILTERING does not repair a table whose key conflicts with the access pattern.'),
    item('Keys are permanent design decisions', 'Changing the access path usually means writing a new table and migrating data.', 'Treat primary-key review as an API and capacity decision, not just schema syntax.'),
  ],
  ring: [
    item('A partition key becomes a token', 'Murmur3 hashing spreads ordinary keys across a large token space.', 'The diagram uses a small illustrative ring; it does not reproduce Cassandra token values.'),
    item('Token ranges belong to nodes', 'The first owner clockwise from the token is responsible for that range.', 'With vnodes, each node owns many non-contiguous ranges rather than one simple arc.'),
    item('A coordinator finds the replicas', 'Token metadata tells the coordinator which nodes own the partition copies.', 'Drivers also maintain metadata and can route token-aware requests directly to likely replicas.'),
    item('Adding a node moves ranges, not tables', 'Streaming transfers affected ranges while the cluster continues serving traffic.', 'Capacity changes consume network and disk resources and should be rate-limited and observed.'),
    item('Skew reveals modeling or topology problems', 'Compare ownership, partition sizes, and traffic—not merely node count.', 'A uniform hash cannot correct a single hot partition key.'),
  ],
  replication: [
    item('Replication factor is copies per datacenter', 'RF=3 means three replicas for each partition in the modeled datacenter.', 'Choose replication independently for each keyspace and datacenter.'),
    item('Topology influences placement', 'Rack-aware placement tries to keep failures from removing every copy together.', 'Snitch and topology configuration must reflect the real infrastructure.'),
    item('Any replica can accept a mutation', 'The coordinator sends the timestamped mutation to the natural replicas.', 'Cassandra uses last-write-wins reconciliation at the cell level for ordinary mutations.'),
    item('Hints bridge temporary outages', 'A reachable coordinator can retain hints for an unavailable replica.', 'Hinted handoff improves convergence but does not replace regular repair.'),
    item('Replication is not backup', 'A bad delete or corrupt mutation is replicated too.', 'Backups and tested restore procedures protect against logical and correlated failures.'),
  ],
  consistency: [
    item('Consistency is chosen per operation', 'ONE favors availability and latency; QUORUM waits for a majority of replicas.', 'Consistency level is part of the request contract, not a global mode switch.'),
    item('A quorum is floor(RF / 2) + 1', 'With RF=3, QUORUM requires two successful replica responses.', 'LOCAL_QUORUM applies this calculation within the local datacenter.'),
    item('R + W greater than RF creates overlap', 'Overlapping read and write acknowledgements can provide strong consistency for ordinary operations.', 'This rule assumes correct topology and timely conflict resolution; it is not transaction isolation.'),
    item('Unavailable is different from timeout', 'Unavailable means too few live replicas were known; timeout means enough may exist but did not answer in time.', 'These failures imply different operational investigations.'),
    item('Measure the tradeoff under failure', 'Test latency and success rates while replicas or links are impaired.', 'Consistency decisions should be validated against the application’s stale-read and outage tolerance.'),
  ],
  'write-path': [
    item('The coordinator forwards the mutation', 'The write is sent to every replica required by the keyspace topology.', 'Acknowledgement depends on the requested consistency level, not necessarily every replica.'),
    item('The commit log protects durability', 'Each replica appends the mutation to its commit log before acknowledging a durable write.', 'Commit-log placement and sync policy affect latency and failure behavior.'),
    item('The memtable keeps sorted state in memory', 'The mutation is applied to an in-memory structure for its table.', 'Commit log and memtable serve different purposes: recovery versus current sorted state.'),
    item('Flush creates an immutable SSTable', 'When thresholds are reached, the memtable is written to disk as a new SSTable.', 'SSTables are never updated in place.'),
    item('Fast writes create background work', 'Compaction, repair, streaming, and backups must share the same disks and network.', 'Write latency can look healthy while background debt accumulates.'),
  ],
  'read-path': [
    item('The coordinator selects replicas', 'Replica selection considers consistency, locality, and observed responsiveness.', 'Dynamic snitching can influence which replicas are preferred.'),
    item('Caches and memtables are checked first', 'Recent data may be satisfied without reading SSTable data blocks.', 'Cache value depends heavily on workload shape and memory pressure.'),
    item('Bloom filters eliminate impossible files', 'A Bloom filter can say definitely absent or maybe present for an SSTable.', 'False positives cost extra reads; false negatives are not allowed.'),
    item('Indexes locate candidate disk blocks', 'Partition indexes and summaries narrow the disk work before data is read.', 'A logical row may still require reconciliation across several SSTables and replicas.'),
    item('The newest cells win during reconciliation', 'Timestamps merge versions into the response returned to the client.', 'Tracing and table metrics help reveal excessive SSTable reads and coordinator work.'),
  ],
  compaction: [
    item('SSTables accumulate immutable history', 'Updates and deletes create newer cells instead of rewriting old files.', 'A read may consult several SSTables to reconstruct the latest row.'),
    item('Compaction merges sorted files', 'Selected SSTables are read and rewritten into new SSTables.', 'Compaction reduces read amplification but creates write amplification.'),
    item('The strategy should match the workload', 'Size-tiered, leveled, and time-window strategies optimize different patterns.', 'TimeWindowCompactionStrategy is often considered for TTL-heavy time-series data.'),
    item('Tombstones disappear only when safe', 'Deletion markers must remain long enough to prevent deleted data from returning from an unrepaired replica.', 'gc_grace_seconds must be coordinated with repair guarantees and failure windows.'),
    item('Compaction debt is an operating signal', 'Watch pending tasks, bytes compacted, disk headroom, and read amplification together.', 'Changing strategy or forcing major compaction requires capacity planning.'),
  ],
  repair: [
    item('Replicas can diverge temporarily', 'Failures, timeouts, and missed mutations can leave copies with different histories.', 'Eventual consistency requires an anti-entropy process to converge every range.'),
    item('Merkle trees compare ranges efficiently', 'Repair summarizes replica data and narrows synchronization to differing ranges.', 'The visualization is conceptual; repair implementation details vary by version and mode.'),
    item('Streaming transfers the missing data', 'Repair sends differing partitions between replicas until their ranges agree.', 'Repair consumes CPU, network, disk, and compaction capacity.'),
    item('Repair cadence protects deletions', 'Every replica should be repaired within the configured tombstone safety window.', 'Missed repair plus expired tombstones can allow deleted values to reappear.'),
    item('Repair must be scheduled and verified', 'Track successful coverage by keyspace, table, token range, and time.', 'A command that started is not evidence that repair completed everywhere.'),
  ],
  lwt: [
    item('Ordinary writes do not compare first', 'Timestamped mutations favor availability and do not provide cross-row isolation.', 'Use ordinary writes whenever compare-and-set semantics are unnecessary.'),
    item('IF clauses invoke Paxos', 'A lightweight transaction coordinates replicas to agree on one conditional value.', 'The cost is multiple network rounds and additional replica state.'),
    item('Serial consistency governs the proposal', 'SERIAL or LOCAL_SERIAL controls the Paxos read phase.', 'The normal consistency level still applies to the mutation after consensus.'),
    item('Contention amplifies latency', 'Competing updates to one partition may retry and create a hot coordination point.', 'Model the key and workflow to avoid unnecessary contention.'),
    item('Use LWT for invariants, not convenience', 'Reserve it for uniqueness, state transitions, or other true compare-and-set requirements.', 'Benchmark the failure and contention cases, not only the uncontended happy path.'),
  ],
  operations: [
    item('Start with service-level signals', 'Measure request latency, throughput, errors, and saturation by operation and table.', 'Cluster averages can hide a single overloaded coordinator or hot partition.'),
    item('Watch the background system', 'Compaction, repair, hints, dropped messages, and streaming reveal accumulating debt.', 'Correlate Cassandra metrics with disk, network, CPU, garbage collection, and filesystem behavior.'),
    item('Capacity includes failure headroom', 'A healthy cluster should survive a node or rack loss without saturating the remainder.', 'Plan disk space for compaction and streaming, not only stored data.'),
    item('Secure every boundary', 'Use authentication, authorization, TLS, secret rotation, and audited administrative access.', 'Keep internode and client encryption aligned with certificate lifecycle operations.'),
    item('Practice recovery before an incident', 'Restore backups, replace nodes, rotate certificates, and test consistency choices.', 'Runbooks become trustworthy only after rehearsal under representative data volume.'),
  ],
  practice: [
    item('Model one access pattern completely', 'Trace its partition key, clustering slice, expected size, and replica path.', 'Expertise begins with a falsifiable model of one real request.'),
    item('Trace one write and one read', 'Account for coordinator, replicas, commit log, memtable, SSTables, and acknowledgements.', 'Use tracing sparingly in production and pair it with metrics.'),
    item('Create failure drills', 'Lose a replica, delay a network, pause compaction, and restore from backup safely.', 'Record expected and observed availability at each consistency level.'),
    item('Measure debt, not just foreground latency', 'A quiet request path can conceal repair, compaction, tombstone, or streaming risk.', 'Healthy operations keep foreground service and background convergence in balance.'),
    item('Explain the tradeoff and repeat', 'Document the access pattern, benchmark, failure result, and operating decision.', 'An expert can predict behavior, gather evidence, revise the model, and teach the reasoning.'),
  ],
};

function RingDiagram({ step, mode }: { step: number; mode: 'architecture' | 'ring' | 'replication' | 'consistency' }) {
  const token = mode === 'ring' && step >= 1;
  const replicas = mode === 'replication' ? Math.min(3, step + 1) : mode === 'consistency' ? 3 : step >= 2 ? 3 : 1;
  return <div className={`cassandra-ring ring-${mode} ring-step-${step}`}><div className="ring-track" />{['N1', 'N2', 'N3', 'N4'].map((node, index) => <div className={`ring-node ring-node-${index + 1} ${index < replicas ? 'replica-node' : ''}`} key={node}><b>{node}</b>{index < replicas && <small>{mode === 'consistency' && step >= 1 && index < 2 ? 'ACK' : `copy ${index + 1}`}</small>}</div>)}<div className="ring-key">user_42{token && <small>hash → token 71</small>}</div>{token && <i className="token-dot" />}{mode === 'consistency' && <div className="quorum-math">RF 3 · {step >= 1 ? 'QUORUM 2' : 'ONE 1'}{step >= 2 && <strong>R + W &gt; RF</strong>}</div>}{mode === 'replication' && step >= 3 && <div className="hint-note">hint retained for N3</div>}</div>;
}

function Pipeline({ labels, step, accent }: { labels: string[]; step: number; accent: string }) { return <div className={`cassandra-pipeline accent-${accent}`}>{labels.map((label, index) => <div className={step >= Math.min(index, 4) ? 'active' : ''} key={label}><span>{label}</span>{index < labels.length - 1 && <i>→</i>}</div>)}</div>; }
function Replica({ name, values }: { name: string; values: string[] }) { return <div className="repair-replica"><b>{name}</b>{values.map((value, index) => <code key={index}>{value}</code>)}</div>; }

function DataDiagram({ chapter, step }: { chapter: CassandraChapter; step: number }) {
  if (chapter === 'architecture' || chapter === 'ring' || chapter === 'replication' || chapter === 'consistency') return <RingDiagram step={step} mode={chapter} />;
  if (chapter === 'modeling') return <div className="query-model"><div className="query-list">{['events for user', 'events by type', 'latest events'].map((q, index) => <span className={step >= index ? 'active' : ''} key={q}>{q}</span>)}</div><div className="model-arrow">→</div><div className="table-stack">{['events_by_user_day', 'events_by_type_day', 'latest_events_by_user'].map((t, index) => <code className={step >= index ? 'active' : ''} key={t}>{t}</code>)}</div>{step >= 3 && <div className="bucket-note">partition bucket: 2026-11-08</div>}{step >= 4 && <div className="size-note">rows × bytes × retention</div>}</div>;
  if (chapter === 'primary-keys') return <div className="key-diagram"><div className="cql-key"><span>PRIMARY KEY</span><code>((user_id, day), event_time)</code></div><div className="key-parts"><b className={step >= 1 ? 'active' : ''}>partition: user_id + day</b><b className={step >= 2 ? 'active' : ''}>cluster: event_time ↓</b></div><div className="partition-rows">{['10:04', '10:01', '09:58'].map((time) => <span key={time}><code>{time}</code>event</span>)}</div>{step >= 3 && <div className="slice-query">WHERE user_id = ? AND day = ? AND event_time &gt; ?</div>}</div>;
  if (chapter === 'write-path') return <Pipeline labels={['coordinator', 'commit log', 'memtable', 'SSTable']} step={step} accent="orange" />;
  if (chapter === 'read-path') return <Pipeline labels={['replica', 'Bloom filter', 'index', 'SSTables', 'reconcile']} step={step} accent="blue" />;
  if (chapter === 'compaction') return <div className="compaction-diagram"><div className="sstable-pile">{[1,2,3,4].map((n) => <span key={n}>SS{n}</span>)}</div><div className="merge-mark">{step >= 1 ? 'merge →' : 'immutable files'}</div><div className={`compacted-file ${step >= 1 ? 'active' : ''}`}>SS5<br /><small>newest cells</small></div>{step >= 2 && <div className="strategy-row"><code>STCS</code><code>LCS</code><code>TWCS</code></div>}{step >= 3 && <div className="tombstone">† tombstone safety window</div>}{step >= 4 && <div className="debt-meter">compaction debt <i /></div>}</div>;
  if (chapter === 'repair') return <div className="repair-diagram"><Replica name="N1" values={['A','B','C']} /><div className="repair-center">{step < 1 ? 'diverged' : step < 2 ? 'Merkle compare' : step < 4 ? 'stream range B' : 'verified ✓'}</div><Replica name="N2" values={['A', step >= 2 ? 'B' : '—', 'C']} />{step >= 3 && <div className="repair-window">repair before gc grace expires</div>}</div>;
  if (chapter === 'lwt') return <div className="paxos-diagram">{['prepare', 'promise', 'propose', 'commit'].map((phase, index) => <span className={step >= index ? 'active' : ''} key={phase}>{phase}</span>)}<code>IF version = 7</code>{step >= 3 && <small>contention → retry</small>}</div>;
  if (chapter === 'operations') return <div className="ops-diagram">{['p95 latency', 'errors', 'compaction', 'repair age', 'disk headroom', 'dropped messages'].map((signal, index) => <span className={step >= Math.floor(index / 2) ? 'active' : ''} key={signal}>{signal}</span>)}{step >= 3 && <div className="secure-boundary">TLS · RBAC · rotate</div>}{step >= 4 && <div className="restore-drill">restore rehearsal ↺</div>}</div>;
  return <div className="practice-diagram cassandra-practice">{['Model', 'Trace', 'Break', 'Measure debt', 'Explain and repeat'].map((text, index) => <div className={step >= index ? 'active' : ''} key={text}><span>{index + 1}</span>{text}</div>)}</div>;
}

function Menu({ current, onSelect }: { current: CassandraChapter; onSelect: (id: CassandraChapter) => void }) { return <details className="chapter-menu"><summary>Chapters</summary><nav aria-label="Cassandra chapters">{CASSANDRA_CHAPTERS.map(([id, name]) => <button className={current === id ? 'current' : ''} onClick={() => onSelect(id)} key={id}>{name}</button>)}</nav></details>; }

export default function CassandraCourse({ onExit }: { onExit: () => void }) {
  const [chapter, setChapter] = useState<CassandraChapter>('architecture');
  const [tour, dispatch] = useReducer(tourReducer, INITIAL_TOUR_STATE);
  const current = LESSONS[chapter][tour.step];

  useEffect(() => { const value = new URLSearchParams(window.location.search).get('chapter'); if (!CASSANDRA_CHAPTERS.some(([id]) => id === value)) return; const timer = window.setTimeout(() => setChapter(value as CassandraChapter), 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { const params = new URLSearchParams(window.location.search); params.set('db', 'cassandra'); params.set('chapter', chapter); window.history.replaceState({}, '', `${window.location.pathname}?${params}`); }, [chapter]);
  useEffect(() => { if (!tour.playing) return; const revision = tour.revision; const timer = window.setTimeout(() => { if (revision === tour.revision) dispatch({ type: 'NEXT' }); }, 3000); return () => window.clearTimeout(timer); }, [tour.playing, tour.revision, tour.step]);

  function select(id: CassandraChapter) { setChapter(id); dispatch({ type: 'RESTART' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  const chapterIndex = CASSANDRA_CHAPTERS.findIndex(([id]) => id === chapter);
  const next = CASSANDRA_CHAPTERS[chapterIndex + 1];

  return <main className="textbook-shell cassandra-shell">
    <header className="site-header"><button className="home-link" onClick={onExit}>Inside Systems</button><div className="header-links"><Menu current={chapter} onSelect={select} /><button popoverTarget="about-cassandra">About</button></div></header>
    <article className="lesson-page"><header className="lesson-heading"><p>CASSANDRA · {String(chapterIndex + 1).padStart(2, '0')} · {String(tour.step + 1).padStart(2, '0')}</p><h1>{current.title}</h1></header>
      <figure className={`diagram expert-diagram cassandra-diagram cassandra-${chapter} cassandra-step-${tour.step}`}><DataDiagram chapter={chapter} step={tour.step} /><figcaption className="sr-only">{current.narration}</figcaption></figure>
      <section className="narration" aria-live="polite"><p>{current.narration}</p><details className="lesson-details"><summary>Show details</summary><p>{current.detail}</p></details></section>
      <div className="playback" aria-label="Lesson playback controls"><button onClick={() => dispatch({ type: 'PREVIOUS' })} disabled={tour.step === 0}>Previous</button><button className="play-button" onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}>{tour.playing ? 'Pause' : 'Play'}</button><span>{tour.step + 1} / {TOUR_STEPS.length}</span><button onClick={() => dispatch({ type: 'NEXT' })} disabled={tour.step === 4}>Next</button><button className="restart-button" onClick={() => dispatch({ type: 'RESTART' })}>Restart</button></div>
      {tour.step === 4 && <div className="continue-row">{next ? <button onClick={() => select(next[0])}>Continue to {next[1]} <span>→</span></button> : <button onClick={() => select('architecture')}>Return to the beginning <span>↺</span></button>}</div>}
    </article>
    <footer><button popoverTarget="sources-cassandra">Model assumptions and sources</button></footer>
    <aside id="about-cassandra" popover="auto" className="text-popover"><button className="close" popoverTarget="about-cassandra" popoverTargetAction="hide">Close</button><h2>Inside Cassandra</h2><p>A guided curriculum from query-first modeling and the token ring through storage, consistency, repair, operations, and expert practice.</p></aside>
    <aside id="sources-cassandra" popover="auto" className="text-popover"><button className="close" popoverTarget="sources-cassandra" popoverTargetAction="hide">Close</button><h2>Model assumptions and sources</h2><p>Diagrams use deliberately small, deterministic examples. They explain Cassandra concepts rather than emulate a running cluster.</p><p><a href="https://cassandra.apache.org/doc/stable/cassandra/architecture/overview.html">Architecture overview</a><br /><a href="https://cassandra.apache.org/doc/stable/cassandra/developing/data-modeling/intro.html">Data modeling</a><br /><a href="https://cassandra.apache.org/doc/stable/cassandra/architecture/storage-engine.html">Storage engine</a><br /><a href="https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compaction/overview.html">Compaction</a></p></aside>
  </main>;
}
