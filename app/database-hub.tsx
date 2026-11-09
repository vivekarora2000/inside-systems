'use client';

import { useEffect, useState } from 'react';
import CassandraCourse from './cassandra-course';
import InsideElasticsearch from './inside-elasticsearch';

type Database = 'elasticsearch' | 'cassandra';

const DATABASES: Array<{ id: Database; eyebrow: string; title: string; description: string; path: string[] }> = [
  { id: 'elasticsearch', eyebrow: 'SEARCH ENGINE', title: 'Elasticsearch', description: 'Follow text from analysis and postings through scoring, shards, recovery, and production operations.', path: ['tokens', 'ranking', 'clusters'] },
  { id: 'cassandra', eyebrow: 'WIDE-COLUMN DATABASE', title: 'Cassandra', description: 'Follow a write around the token ring, through replicas, consistency, SSTables, repair, and resilient operations.', path: ['partition', 'replicas', 'storage'] },
];

export default function DatabaseHub() {
  const [database, setDatabase] = useState<Database | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('db');
    if (value !== 'elasticsearch' && value !== 'cassandra') return;
    const timer = window.setTimeout(() => setDatabase(value), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function choose(next: Database | null) {
    setDatabase(next);
    const params = new URLSearchParams(window.location.search);
    params.delete('chapter');
    if (next) params.set('db', next); else params.delete('db');
    window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (database === 'elasticsearch') return <InsideElasticsearch onExit={() => choose(null)} />;
  if (database === 'cassandra') return <CassandraCourse onExit={() => choose(null)} />;

  return <main className="hub-shell">
    <header className="site-header"><a href="#choose">Inside Systems</a></header>
    <section className="hub-hero" id="choose">
      <p className="hub-kicker">CHOOSE A SYSTEM</p>
      <h1>Choose a system<br />to explore.</h1>
      <p className="hub-intro">Follow data through the structures, request paths, and tradeoffs that make each database work.</p>
      <div className="database-grid">
        {DATABASES.map((item, index) => <button className={`database-card card-${item.id}`} onClick={() => choose(item.id)} key={item.id}>
          <span className="card-number">0{index + 1}</span><span className="card-eyebrow">{item.eyebrow}</span><strong>{item.title}</strong><span className="card-description">{item.description}</span>
          <span className="card-path">{item.path.map((step) => <code key={step}>{step}</code>)}</span><span className="card-action">Open field guide <b>→</b></span>
        </button>)}
      </div>
    </section>
  </main>;
}
