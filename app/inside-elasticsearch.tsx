'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { EXPERT_CHAPTERS, ExpertChapter, type ChapterId, type ExpertChapterId } from './expert-chapters';
import { buildPrototype, INITIAL_TOUR_STATE, PROTOTYPE_DOCUMENTS, TOUR_STEPS, tourReducer } from './prototype-model';

const LESSONS = [
  { label: 'DOCUMENTS · 01', title: 'Finding a word without reading every document', narration: 'We have three documents. Which ones contain “river”?' },
  { label: 'SEARCH · 01', title: 'Finding a word without reading every document', narration: 'We could read every document. But that becomes expensive as the collection grows.' },
  { label: 'SEARCH · 02', title: 'Finding a word without reading every document', narration: 'An inverted index maps each term to the documents that contain it.' },
  { label: 'SEARCH · 03', title: 'Looking up a term', narration: 'For this query, we look up one term and retrieve its posting list.' },
  { label: 'SEARCH · 04', title: 'Returning the matches', narration: 'These are our matching documents. Next, we need to decide their order.' },
];

function DocumentText({ id }: { id: string }) {
  if (id === 'D1') return <><tspan>The </tspan><tspan className="match-word">river</tspan><tspan> runs beside</tspan><tspan x="16" dy="21">the park.</tspan></>;
  if (id === 'D2') return <><tspan>The park has a stone</tspan><tspan x="16" dy="21">bridge.</tspan></>;
  return <><tspan>The café overlooks</tspan><tspan x="16" dy="21">the </tspan><tspan className="match-word">river</tspan><tspan>.</tspan></>;
}

export default function InsideElasticsearch({ onExit }: { onExit?: () => void }) {
  const [tour, dispatch] = useReducer(tourReducer, INITIAL_TOUR_STATE);
  const [chapter, setChapter] = useState<ChapterId>('index');
  const model = useMemo(() => buildPrototype(PROTOTYPE_DOCUMENTS[0].body, 'river'), []);
  const postings = Object.fromEntries(['river', 'park', 'bridge'].map((term) => [term, model.engine.getPostings(term).map((posting) => posting.documentId)]));
  const lesson = LESSONS[tour.step];

  useEffect(() => {
    if (!tour.playing) return;
    const revision = tour.revision;
    const timer = window.setTimeout(() => {
      if (revision === tour.revision) dispatch({ type: 'NEXT' });
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [tour.playing, tour.revision, tour.step]);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('chapter');
    if (!EXPERT_CHAPTERS.some(([id]) => id === value)) return;
    const timer = window.setTimeout(() => setChapter(value as ExpertChapterId), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (chapter === 'index') params.delete('chapter');
    else params.set('chapter', chapter);
    window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
  }, [chapter]);

  function navigate(next: ChapterId) {
    setChapter(next);
    dispatch({ type: 'RESTART' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (chapter !== 'index') return <ExpertChapter key={chapter} chapter={chapter} onNavigate={navigate} onExit={onExit} />;

  return <main className="textbook-shell">
    <header className="site-header">
      {onExit ? <button className="home-link" onClick={onExit}>Inside Systems</button> : <a href="#lesson">Inside Systems</a>}
      <div className="header-links">
        <details className="chapter-menu"><summary>Chapters</summary><nav aria-label="Chapters"><button className="current" onClick={() => dispatch({ type: 'GOTO', step: 0 })}>Documents and the index</button>{EXPERT_CHAPTERS.map(([id, label]) => <button onClick={() => navigate(id)} key={id}>{label}</button>)}</nav></details>
        <button popoverTarget="about">About</button>
      </div>
    </header>

    <article className="lesson-page" id="lesson">
      <header className="lesson-heading">
        <p>{lesson.label}</p>
        <h1>{lesson.title}</h1>
      </header>

      <figure className={`diagram step-${tour.step}`}>
        <svg viewBox="0 0 960 440" role="img" aria-labelledby="diagram-title diagram-description">
          <title id="diagram-title">{lesson.title}</title>
          <desc id="diagram-description">{lesson.narration}</desc>

          {PROTOTYPE_DOCUMENTS.map((document) => <g className={`document document-${document.id}`} key={document.id}>
            <rect width="240" height="112" />
            <text className="document-id" x="16" y="24">{document.id}</text>
            <text className="document-copy" x="16" y="55"><DocumentText id={document.id} /></text>
            <rect className="scan-line" x="0" y="0" width="240" height="3" />
          </g>)}

          <g className="index-links" aria-hidden="true">
            <path className="link-one" d="M 292 97 C 420 97, 470 100, 585 105" />
            <path className="link-two" d="M 292 217 C 420 217, 470 165, 585 165" />
            <path className="link-three" d="M 292 337 C 420 337, 470 225, 585 225" />
          </g>

          <g className="index-block">
            <text className="small-label" x="585" y="52">INVERTED INDEX</text>
            {(['river', 'park', 'bridge'] as const).map((term, index) => <g className={`posting posting-${term}`} key={term} transform={`translate(585 ${78 + index * 61})`}>
              <rect width="300" height="44" />
              <text className="term" x="14" y="28">{term}</text>
              <text className="arrow" x="104" y="28">→</text>
              <text className="ids" x="137" y="28">{postings[term].join('   ')}</text>
            </g>)}
          </g>

          <g className="query-label"><text x="585" y="48">query</text><rect x="640" y="23" width="92" height="36" /><text className="query-term" x="657" y="47">river</text><path d="M 686 62 L 686 76" /></g>

          <g className="result-list">
            <text className="small-label" x="230" y="62">MATCHING DOCUMENTS</text>
            {['D1', 'D3'].map((id, index) => <g className={`result result-${id}`} key={id} transform={`translate(230 ${92 + index * 112})`}>
              <rect width="500" height="84" />
              <text className="document-id" x="18" y="25">{id}</text>
              <text className="result-copy" x="18" y="56">{PROTOTYPE_DOCUMENTS.find((doc) => doc.id === id)?.body}</text>
              <text className="match-label" x="420" y="48">matches “river”</text>
            </g>)}
          </g>
        </svg>

        <div className="mobile-diagram" aria-hidden="true">
          {tour.step < 2 && PROTOTYPE_DOCUMENTS.map((document) => <div className={`mobile-document mobile-${document.id}`} key={document.id}><code>{document.id}</code><p>{document.body}</p>{tour.step === 1 && ['D1', 'D3'].includes(document.id) && <span>contains “river”</span>}</div>)}
          {tour.step === 2 && <div className="mobile-index"><span>inverted index</span>{(['river', 'park', 'bridge'] as const).map((term) => <p key={term}><code>{term}</code><b>→</b>{postings[term].join(', ')}</p>)}</div>}
          {tour.step === 3 && <div className="mobile-index query-mobile"><span>query: <code>river</code></span><p><code>river</code><b>→</b>{postings.river.join(', ')}</p></div>}
          {tour.step === 4 && <div className="mobile-results"><span>matching documents</span>{['D1', 'D3'].map((id) => <div key={id}><code>{id}</code><p>{PROTOTYPE_DOCUMENTS.find((doc) => doc.id === id)?.body}</p></div>)}</div>}
        </div>
        <figcaption className="sr-only">{lesson.narration} {tour.step === 2 && `The visible postings are river to ${postings.river.join(', ')}, park to ${postings.park.join(', ')}, and bridge to ${postings.bridge.join(', ')}.`}</figcaption>
      </figure>

      <section className="narration" aria-live="polite">
        <p>{lesson.narration}</p>
        {tour.step === 1 && <small>This scan is an illustration, not a performance benchmark.</small>}
        <details className="lesson-details"><summary>Show details</summary>
          {tour.step <= 1 && <p>The lesson analyzer lowercases terms and removes configured stop words. The indexed terms in D1 are {model.analysis.tokens.map((token) => <code key={token.position}>{token.term}</code>)}.</p>}
          {tour.step === 2 && <p>These entries come from the engine’s posting lists. Positions are {model.engine.getPostings('river').map((posting) => <code key={posting.documentId}>{posting.documentId}: {(posting.body?.positions ?? []).join(', ')}</code>)}.</p>}
          {tour.step === 3 && <p>The analyzed query contains one term, <code>{model.response.queryTerms[0]}</code>. Its posting list contains {model.response.candidateDocumentIds.join(' and ')}.</p>}
          {tour.step === 4 && <p>The engine returns {model.response.results.map((result) => <code key={result.document.id}>{result.document.id} score {result.score.toFixed(3)}</code>)}. Ranking is introduced in the next lesson.</p>}
        </details>
      </section>

      <div className="playback" aria-label="Lesson playback controls">
        <button onClick={() => dispatch({ type: 'PREVIOUS' })} disabled={tour.step === 0}>Previous</button>
        <button className="play-button" onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}>{tour.playing ? 'Pause' : 'Play'}</button>
        <span>{tour.step + 1} / {TOUR_STEPS.length}</span>
        <button onClick={() => dispatch({ type: 'NEXT' })} disabled={tour.step === TOUR_STEPS.length - 1}>Next</button>
        <button className="restart-button" onClick={() => dispatch({ type: 'RESTART' })}>Restart</button>
      </div>

      {tour.step === 4 && <div className="continue-row"><button onClick={() => navigate('ranking')}>Continue to ranking <span>→</span></button></div>}
    </article>

    <footer><button popoverTarget="sources">Model assumptions and sources</button></footer>

    <aside id="about" popover="auto" className="text-popover"><button className="close" popoverTarget="about" popoverTargetAction="hide">Close</button><h2>About</h2><p>Inside Systems is an animated textbook for understanding search. This prototype uses a real browser-based search engine for analysis, postings, matching, and scores.</p></aside>
    <aside id="sources" popover="auto" className="text-popover"><button className="close" popoverTarget="sources" popoverTargetAction="hide">Close</button><h2>Model assumptions and sources</h2><p>This is an executable teaching model, not Elasticsearch running in the browser. Actual Elasticsearch behavior depends on configuration and version.</p><p><a href="https://www.elastic.co/docs/manage-data/data-store/text-analysis">Elastic: text analysis</a><br /><a href="https://www.elastic.co/docs/manage-data/data-store/index-basics">Elastic: index fundamentals</a></p></aside>
  </main>;
}
