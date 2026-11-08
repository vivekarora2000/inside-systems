'use client';

/* eslint-disable react-hooks/set-state-in-effect -- one hydration effect restores an explicitly shared URL state */

import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useState } from 'react';
import { EXPERIMENTS, ORIGINAL_CORPUS, type Experiment } from './corpus';
import {
  analyze,
  DEFAULT_SETTINGS,
  SearchEngine,
  type SearchDocument,
  type SearchResult,
  type SearchSettings,
} from './search-engine';

type Stage = 'analyze' | 'retrieve' | 'score' | 'rank';
type Draft = SearchDocument & { isNew?: boolean };

function number(value: number, digits = 2) {
  return value.toFixed(digits);
}

function HighlightedText({
  text,
  terms,
  activeTerm,
  onTerm,
}: {
  text: string;
  terms: string[];
  activeTerm: string | null;
  onTerm: (term: string | null) => void;
}) {
  const matched = new Set(terms);
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const token of analyze(text, false).allTokens) {
    if (!matched.has(token.term)) continue;
    if (token.start > cursor) parts.push(text.slice(cursor, token.start));
    parts.push(
      <mark
        className={activeTerm === token.term ? 'term-highlight active-term' : 'term-highlight'}
        key={`${token.position}-${token.start}`}
        onMouseEnter={() => onTerm(token.term)}
        onMouseLeave={() => onTerm(null)}
      >
        {text.slice(token.start, token.end)}
      </mark>,
    );
    cursor = token.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts.length ? parts : text}</>;
}

function Control({
  label,
  value,
  min,
  max,
  step,
  onChange,
  note,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  note: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  const labelId = `control-${label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="control">
      <span><strong id={labelId}>{label}</strong><input className="control-number" aria-label={`${label} value`} type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} /></span>
      <input
        type="range"
        aria-labelledby={labelId}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--range-fill': `${fill}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>{note}</small>
    </div>
  );
}

function FieldBars({ result, max }: { result: SearchResult; max: number }) {
  const title = result.explanation.titleScore;
  const body = result.explanation.bodyScore;
  return (
    <div className="field-bars" aria-label={`Title ${number(title)}, body ${number(body)}`}>
      <i className="title-bar" style={{ width: `${Math.max(2, (title / Math.max(max, 0.01)) * 100)}%` }} />
      <i className="body-bar" style={{ width: `${Math.max(2, (body / Math.max(max, 0.01)) * 100)}%` }} />
    </div>
  );
}

export default function InsideSearch() {
  const [documents, setDocuments] = useState<SearchDocument[]>(ORIGINAL_CORPUS);
  const [queryInput, setQueryInput] = useState('night market');
  const [query, setQuery] = useState('night market');
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS);
  const [selectedId, setSelectedId] = useState('northstar-market');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>('retrieve');
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [indexTerm, setIndexTerm] = useState('night');
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [rankBaseline, setRankBaseline] = useState<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ ...ORIGINAL_CORPUS[0] });
  const [corpusChanged, setCorpusChanged] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  const engine = useMemo(
    () => new SearchEngine(documents, { removeStopWords: settings.removeStopWords }),
    [documents, settings.removeStopWords],
  );
  const response = useMemo(() => engine.search(query, settings), [engine, query, settings]);
  const stats = useMemo(() => engine.getStats(), [engine]);
  const selectedResult = response.results.find((result) => result.document.id === selectedId) ?? response.results[0];
  const maxScore = Math.max(...response.results.map((result) => result.score), 1);
  const vocabulary = useMemo(() => Object.keys(stats.documentFrequencies).sort(), [stats.documentFrequencies]);
  const inspectedPostings = engine.getPostings(indexTerm);
  const compareResults = compareIds
    .map((id) => response.results.find((result) => result.document.id === id))
    .filter((result): result is SearchResult => Boolean(result));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextQuery = params.get('q');
    if (nextQuery !== null) {
      setQueryInput(nextQuery);
      setQuery(nextQuery);
    }
    const nextSettings: SearchSettings = {
      titleWeight: Number(params.get('tw')) || DEFAULT_SETTINGS.titleWeight,
      k1: Number(params.get('k1')) || DEFAULT_SETTINGS.k1,
      b: params.has('b') ? Number(params.get('b')) : DEFAULT_SETTINGS.b,
      removeStopWords: params.get('stop') !== '0',
      matchMode: params.get('mode') === 'AND' ? 'AND' : 'OR',
    };
    setSettings(nextSettings);
    if (nextQuery !== null) setIndexTerm(analyze(nextQuery, nextSettings.removeStopWords).tokens[0]?.term ?? '');
    if (params.get('sel')) setSelectedId(params.get('sel')!);
    if (params.get('compare')) setCompareIds(params.get('compare')!.split(',').slice(0, 2));
    if (params.get('exp')) setExperimentId(params.get('exp'));
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('tw', String(settings.titleWeight));
    params.set('k1', String(settings.k1));
    params.set('b', String(settings.b));
    params.set('stop', settings.removeStopWords ? '1' : '0');
    params.set('mode', settings.matchMode);
    if (experimentId) params.set('exp', experimentId);
    if (selectedId) params.set('sel', selectedId);
    if (compareIds.length) params.set('compare', compareIds.join(','));
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  }, [urlReady, query, settings, experimentId, selectedId, compareIds]);

  function currentRanks() {
    return Object.fromEntries(response.results.map((result, index) => [result.document.id, index + 1]));
  }

  function updateSettings(patch: Partial<SearchSettings>) {
    setRankBaseline(currentRanks());
    setExperimentId(null);
    setSettings((current) => ({ ...current, ...patch }));
  }

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    const nextQuery = queryInput.trim();
    const nextResponse = engine.search(nextQuery, settings);
    setQuery(nextQuery);
    setIndexTerm(nextResponse.queryTerms[0] ?? '');
    setSelectedId(nextResponse.results[0]?.document.id ?? '');
    setRankBaseline({});
    setExperimentId(null);
    setCompareIds([]);
    setStage('retrieve');
  }

  function runQuery(nextQuery: string) {
    const nextResponse = engine.search(nextQuery, settings);
    setQueryInput(nextQuery);
    setQuery(nextQuery);
    setIndexTerm(nextResponse.queryTerms[0] ?? '');
    setSelectedId(nextResponse.results[0]?.document.id ?? '');
    setRankBaseline({});
    setExperimentId(null);
    setCompareIds([]);
    setStage('retrieve');
  }

  function loadExperiment(experiment: Experiment) {
    setRankBaseline(currentRanks());
    setQueryInput(experiment.query);
    setQuery(experiment.query);
    setSettings({ ...DEFAULT_SETTINGS, ...experiment.settings });
    setExperimentId(experiment.id);
    setCompareIds(experiment.compareIds);
    setSelectedId(experiment.compareIds[0]);
    setStage(experiment.id === 'rare-words' ? 'retrieve' : 'score');
    setIndexTerm(experiment.query.split(' ')[0]);
    document.getElementById('index')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetAll() {
    setDocuments(ORIGINAL_CORPUS);
    setQueryInput('night market');
    setQuery('night market');
    setSettings(DEFAULT_SETTINGS);
    setSelectedId('northstar-market');
    setCompareIds([]);
    setExperimentId(null);
    setRankBaseline({});
    setIndexTerm('night');
    setCorpusChanged(false);
    setNotice('Restored the original 48-document corpus and ranking settings.');
  }

  function toggleCompare(documentId: string) {
    setCompareIds((current) => current.includes(documentId)
      ? current.filter((id) => id !== documentId)
      : [...current.slice(-1), documentId]);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function openDocument(documentId: string) {
    const document = documents.find((item) => item.id === documentId) ?? documents[0];
    setDraft({ ...document });
    setDrawerOpen(true);
  }

  function newDocument() {
    setDraft({ id: '', title: '', category: 'Community', body: '', isNew: true });
  }

  function saveDocument() {
    if (!draft.title.trim()) {
      setNotice('Give the document a title before saving.');
      return;
    }
    const before = stats;
    const saved: SearchDocument = {
      id: draft.isNew || !draft.id ? `custom-${Date.now()}` : draft.id,
      title: draft.title.trim(),
      category: draft.category.trim() || 'Uncategorized',
      body: draft.body.trim(),
    };
    const next = draft.isNew
      ? [...documents, saved]
      : documents.map((document) => document.id === saved.id ? saved : document);
    const after = new SearchEngine(next, { removeStopWords: settings.removeStopWords }).getStats();
    const vocabularyDelta = after.vocabularySize - before.vocabularySize;
    setDocuments(next);
    setDraft({ ...saved });
    setSelectedId(saved.id);
    setCorpusChanged(true);
    setNotice(`${draft.isNew ? 'Added' : 'Reindexed'} “${saved.title}.” Vocabulary ${vocabularyDelta >= 0 ? 'grew by' : 'shrunk by'} ${Math.abs(vocabularyDelta)} term${Math.abs(vocabularyDelta) === 1 ? '' : 's'}.`);
  }

  function deleteDocument() {
    if (draft.isNew || !draft.id) return;
    const next = documents.filter((document) => document.id !== draft.id);
    setDocuments(next);
    setCorpusChanged(true);
    setNotice(`Removed “${draft.title}” from memory and rebuilt every posting list. Restore the corpus at any time.`);
    setDraft({ ...next[0] });
  }

  const suggestionEntries = Object.entries(response.suggestions).filter(([, suggestions]) => suggestions.length);
  const activeExperiment = EXPERIMENTS.find((experiment) => experiment.id === experimentId);

  return (
    <main id="top">
      <header className="masthead">
        <a className="brand" href="#top" aria-label="Inside Search home"><span className="brand-mark">IS</span><span>Inside Search</span></a>
        <span className="masthead-note">A small engine, opened all the way up</span>
        <div className="header-actions">
          <button className="text-button" onClick={copyLink}>{copied ? 'Copied' : 'Copy experiment link'}</button>
          <button className="solid-button small" onClick={() => openDocument(selectedId)}>Edit the world</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="kicker">Search lab · Bellwether City</p>
          <h1>Search for something.<br /><em>See why it ranked.</em></h1>
        </div>
        <div className="hero-aside">
          <p>Type a query, trace it into a real inverted index, and change the scoring rules beneath the results.</p>
          <div className="hero-stats"><span><b>{stats.corpusSize}</b> documents</span><span><b>{stats.vocabularySize}</b> terms</span><span><b>0</b> servers</span></div>
        </div>
      </section>

      <nav className="mobile-tabs" aria-label="Workspace sections">
        <button onClick={() => document.getElementById('search')?.scrollIntoView()}>Search</button>
        <button onClick={() => document.getElementById('index')?.scrollIntoView()}>Index</button>
        <button onClick={() => document.getElementById('results')?.scrollIntoView()}>Results</button>
        <button onClick={() => document.getElementById('explain')?.scrollIntoView()}>Explain</button>
      </nav>

      <section className="workspace">
        <div className="main-column">
          <section className="search-section" id="search">
            <div className="section-intro"><span className="section-number">01</span><div><p className="overline">Send a query through the engine</p><h2>Start with words</h2></div></div>
            <form className="searchbar" onSubmit={submitSearch}>
              <span className="search-glyph" aria-hidden="true">⌕</span>
              <input aria-label="Search Bellwether City" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="Try a place, event, or idea" />
              <button type="submit">Search</button>
            </form>
            <div className="examples" aria-label="Example searches"><span>Try</span>{['night market', 'zephyrite harbor', 'willow trail', 'fery'].map((example) => <button key={example} onClick={() => runQuery(example)}>{example}</button>)}</div>
            {suggestionEntries.length > 0 && (
              <div className="suggestions" role="status">
                <span>Nothing silently changed.</span>
                {suggestionEntries.map(([misspelled, suggestions]) => <p key={misspelled}>No index entry for <code>{misspelled}</code>. Did you mean {suggestions.map((suggestion, index) => <Fragment key={suggestion}>{index > 0 && ', '}<button onClick={() => runQuery(query.replace(misspelled, suggestion))}>{suggestion}</button></Fragment>)}?</p>)}
              </div>
            )}
            {!query.trim() && <div className="empty-state"><strong>Begin with a word.</strong><span>The engine will show each step instead of guessing what you meant.</span></div>}
            {query.trim() && response.analysis.tokens.length === 0 && <div className="empty-state"><strong>Every token was filtered.</strong><span>Turn off stop-word removal to search those words.</span></div>}
          </section>

          <section className="experiments" aria-labelledby="experiments-title">
            <div className="experiments-heading"><div><span className="overline">Try an experiment</span><h2 id="experiments-title">Four ways ranking gets interesting</h2></div><button className="text-button" onClick={resetAll}>Reset everything</button></div>
            <div className="experiment-grid">
              {EXPERIMENTS.map((experiment) => (
                <button className={experimentId === experiment.id ? 'experiment-card active' : 'experiment-card'} key={experiment.id} onClick={() => loadExperiment(experiment)}>
                  <span>{experiment.number}</span><strong>{experiment.title}</strong><small>{experiment.concept}</small><i>Run →</i>
                </button>
              ))}
            </div>
            {activeExperiment && <div className="experiment-prompt"><b>Now try this:</b> {activeExperiment.action}</div>}
          </section>

          <section className="index-explorer" id="index">
            <div className="index-heading">
              <div className="section-intro"><span className="section-number">02</span><div><p className="overline">The centerpiece · live index</p><h2>Open the inverted index</h2></div></div>
              <p>Instead of scanning every document, the engine jumps from each query term to the exact documents—and positions—where it appears.</p>
            </div>

            <div className="token-pipeline" aria-label="Query tokens entering the index">
              <div className="pipeline-source"><span>Query</span><code>{query || '∅'}</code></div>
              <span className="pipeline-arrow" aria-hidden="true">→</span>
              <div className="pipeline-tokens">
                {response.analysis.allTokens.map((token) => (
                  <button
                    key={`${token.position}-${token.term}`}
                    className={`${token.removed ? 'removed token-chip' : 'token-chip'} ${indexTerm === token.term ? 'selected' : ''}`}
                    onClick={() => !token.removed && setIndexTerm(token.term)}
                    disabled={token.removed}
                    title={token.removed ? 'Removed stop word' : `Inspect ${token.term}`}
                  >
                    {token.term}<small>{token.removed ? 'removed' : `pos ${token.position}`}</small>
                  </button>
                ))}
                {!response.analysis.allTokens.length && <span className="muted">No tokens yet</span>}
              </div>
              <span className="pipeline-arrow" aria-hidden="true">→</span>
              <div className="pipeline-source"><span>Candidates</span><code>{response.candidateDocumentIds.length} docs</code></div>
            </div>

            <div className="index-browser">
              <aside>
                <label htmlFor="term-browser">Inspect any term</label>
                <input id="term-browser" list="vocabulary" value={indexTerm} onChange={(event) => setIndexTerm(event.target.value.toLocaleLowerCase())} />
                <datalist id="vocabulary">{vocabulary.map((term) => <option value={term} key={term} />)}</datalist>
                <dl>
                  <div><dt>document frequency</dt><dd>{stats.documentFrequencies[indexTerm] ?? 0} / {stats.corpusSize}</dd></div>
                  <div><dt>IDF</dt><dd>{stats.documentFrequencies[indexTerm] ? number(Math.log(1 + (stats.corpusSize - stats.documentFrequencies[indexTerm] + 0.5) / (stats.documentFrequencies[indexTerm] + 0.5)), 3) : '—'}</dd></div>
                  <div><dt>posting list</dt><dd>{inspectedPostings.length} entries</dd></div>
                </dl>
                <p>Lower document frequency makes a matched term more informative.</p>
              </aside>

              <div className="posting-table" role="region" aria-label={`Postings for ${indexTerm}`} tabIndex={0}>
                <div className="posting-head"><code>term: “{indexTerm || '—'}”</code><span>doc → field tf → token positions</span></div>
                {inspectedPostings.length ? inspectedPostings.map((posting) => {
                  const document = documents.find((item) => item.id === posting.documentId);
                  return (
                    <button className={selectedId === posting.documentId ? 'posting-row selected' : 'posting-row'} key={posting.documentId} onClick={() => { setSelectedId(posting.documentId); setStage('score'); }}>
                      <span className="posting-doc"><code>{posting.documentId}</code><small>{document?.title}</small></span>
                      <span>{posting.title ? <><b>title</b><code>tf {posting.title.tf}</code><code>@ [{posting.title.positions.join(', ')}]</code></> : <i>title —</i>}</span>
                      <span>{posting.body ? <><b>body</b><code>tf {posting.body.tf}</code><code>@ [{posting.body.positions.join(', ')}]</code></> : <i>body —</i>}</span>
                      <strong>inspect →</strong>
                    </button>
                  );
                }) : <div className="no-postings"><strong>No posting list.</strong><span>This exact term is not in the vocabulary. The engine does not silently substitute another word.</span></div>}
              </div>
            </div>
          </section>

          {compareIds.length > 0 && (
            <section className="comparison" aria-labelledby="comparison-title">
              <div className="comparison-heading"><div><p className="overline">Signature interaction</p><h2 id="comparison-title">Why did this win?</h2></div><button className="icon-button" onClick={() => setCompareIds([])} aria-label="Close comparison">×</button></div>
              {compareResults.length < 2 ? (
                <div className="comparison-empty"><strong>Select one more ranked result.</strong><span>Use “Compare” on any result to put its evidence side by side.</span></div>
              ) : <Comparison results={compareResults as [SearchResult, SearchResult]} b={settings.b} stats={stats} activeTerm={activeTerm} onTerm={setActiveTerm} />}
            </section>
          )}

          <section className="results-section" id="results">
            <div className="results-heading"><div className="section-intro"><span className="section-number">03</span><div><p className="overline">Weighted title + body BM25</p><h2>Ranked results</h2></div></div><div><b>{response.results.length}</b> matches <span>·</span> deterministic order</div></div>
            {response.results.length ? (
              <ol className="results-list">
                {response.results.map((result, index) => {
                  const movement = rankBaseline[result.document.id] ? rankBaseline[result.document.id] - (index + 1) : 0;
                  const compared = compareIds.includes(result.document.id);
                  return (
                    <li key={result.document.id} className={selectedId === result.document.id ? 'result-card selected' : 'result-card'}>
                      <button className="result-main" onClick={() => { setSelectedId(result.document.id); setStage('score'); }}>
                        <span className="rank">{String(index + 1).padStart(2, '0')}{movement !== 0 && <i className={movement > 0 ? 'up' : 'down'}>{movement > 0 ? `↑ ${movement}` : `↓ ${Math.abs(movement)}`}</i>}</span>
                        <span className="result-copy">
                          <span className="category">{result.document.category}</span>
                          <strong><HighlightedText text={result.document.title} terms={result.explanation.matchedTerms} activeTerm={activeTerm} onTerm={setActiveTerm} /></strong>
                          <small><HighlightedText text={result.document.body} terms={result.explanation.matchedTerms} activeTerm={activeTerm} onTerm={setActiveTerm} /></small>
                          <span className="matched-terms">{result.explanation.matchedTerms.map((term) => <code className={activeTerm === term ? 'active-term' : ''} key={term} onMouseEnter={() => setActiveTerm(term)} onMouseLeave={() => setActiveTerm(null)}>{term}</code>)}</span>
                        </span>
                        <span className="score"><small>score</small><b>{number(result.score, 3)}</b><FieldBars result={result} max={maxScore} /><i>title <em /> body</i></span>
                      </button>
                      <div className="result-actions"><button onClick={() => toggleCompare(result.document.id)}>{compared ? '✓ Comparing' : '＋ Compare'}</button><button onClick={() => openDocument(result.document.id)}>Edit doc</button></div>
                    </li>
                  );
                })}
              </ol>
            ) : query.trim() && response.analysis.tokens.length > 0 ? <div className="empty-state large"><strong>No documents satisfy {settings.matchMode} matching.</strong><span>Try OR mode, inspect missing terms above, or edit the corpus.</span></div> : null}
          </section>
        </div>

        <aside className="inspector" id="explain">
          <div className="sticky-inspector">
            <div className="inspector-status"><span>Query journey</span><b>● live index</b></div>
            <div className="journey-tabs" role="tablist" aria-label="Query journey">
              {(['analyze', 'retrieve', 'score', 'rank'] as Stage[]).map((item, index) => <button role="tab" aria-selected={stage === item} className={stage === item ? 'active' : ''} key={item} onClick={() => setStage(item)}><span>0{index + 1}</span>{item}</button>)}
            </div>
            <div className="stage-panel">
              {stage === 'analyze' && <AnalyzeStage response={response} activeTerm={activeTerm} onTerm={setActiveTerm} />}
              {stage === 'retrieve' && <RetrieveStage response={response} documents={documents} matchMode={settings.matchMode} activeTerm={activeTerm} onTerm={(term) => { setActiveTerm(term); if (term) setIndexTerm(term); }} />}
              {stage === 'score' && <ScoreStage result={selectedResult} activeTerm={activeTerm} onTerm={setActiveTerm} />}
              {stage === 'rank' && <RankStage results={response.results} selectedId={selectedId} onSelect={setSelectedId} />}
            </div>

            <div className="controls-heading"><div><p className="overline">Change the rules</p><h2>Ranking controls</h2></div><button className="text-button" onClick={() => updateSettings(DEFAULT_SETTINGS)}>Reset</button></div>
            <div className="controls">
              <Control label="Title weight" value={settings.titleWeight} min={0} max={5} step={0.1} onChange={(value) => updateSettings({ titleWeight: value })} note="How much title matches count relative to body matches." />
              <Control label="k1 · term saturation" value={settings.k1} min={0.2} max={3} step={0.1} onChange={(value) => updateSettings({ k1: value })} note="Higher values let repeated terms add influence for longer." />
              <Control label="b · length normalization" value={settings.b} min={0} max={1} step={0.05} onChange={(value) => updateSettings({ b: value })} note="At 0, length is ignored. At 1, field length has full effect." />
              <div className="switch-control"><span><strong>Match mode</strong><small>AND requires every query term.</small></span><div><button className={settings.matchMode === 'OR' ? 'active' : ''} onClick={() => updateSettings({ matchMode: 'OR' })}>OR</button><button className={settings.matchMode === 'AND' ? 'active' : ''} onClick={() => updateSettings({ matchMode: 'AND' })}>AND</button></div></div>
              <label className="toggle-control"><span><strong>Remove stop words</strong><small>Rebuilds the index and shows discarded tokens.</small></span><input type="checkbox" checked={settings.removeStopWords} onChange={(event) => updateSettings({ removeStopWords: event.target.checked })} /><i /></label>
            </div>

            <div className="index-stats"><span>Index now</span><dl><div><dt>documents</dt><dd>{stats.corpusSize}</dd></div><div><dt>vocabulary</dt><dd>{stats.vocabularySize}</dd></div><div><dt>avg title</dt><dd>{number(stats.averageFieldLengths.title, 1)} tokens</dd></div><div><dt>avg body</dt><dd>{number(stats.averageFieldLengths.body, 1)} tokens</dd></div></dl></div>
          </div>
        </aside>
      </section>

      <section className="how-it-works">
        <div><p className="overline">Method, not magic</p><h2>How it works</h2><p>Every number shown in the interface comes from the same engine that ranks the results. There is no second explanation model and no hidden query rewrite.</p></div>
        <div className="formula-card"><code>score(d,q) = w<sub>title</sub> · BM25<sub>title</sub> + 1 · BM25<sub>body</sub></code><p>IDF = ln(1 + (N − df + 0.5) / (df + 0.5))</p></div>
        <ul><li>Query terms count once in this release.</li><li>No stemming, synonyms, embeddings, or semantic claims.</li><li>Ties break deterministically by document ID.</li><li>Edits live in this tab and reset on reload.</li></ul>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-mark">IS</span><span>Inside Search</span></a><p>Built to make lexical retrieval tangible.</p>{process.env.NEXT_PUBLIC_REPO_URL && <a href={process.env.NEXT_PUBLIC_REPO_URL}>View source ↗</a>}</footer>

      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

      {drawerOpen && (
        <div className="drawer-shell" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
          <button className="drawer-scrim" aria-label="Close document editor" onClick={() => setDrawerOpen(false)} />
          <aside className="document-drawer">
            <div className="drawer-heading"><div><p className="overline">Edit the world</p><h2 id="drawer-title">Change the corpus</h2></div><button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="Close">×</button></div>
            <p className="drawer-note">Changes reanalyze every document and rebuild the index immediately. They live only in this browser tab; shared links reopen the built-in corpus.</p>
            <div className="drawer-toolbar"><label><span>Inspect a document</span><select value={draft.isNew ? '__new' : draft.id} onChange={(event) => event.target.value === '__new' ? newDocument() : openDocument(event.target.value)}><option value="__new">＋ New document</option>{documents.map((document) => <option value={document.id} key={document.id}>{document.title}</option>)}</select></label><button className="outline-button" onClick={newDocument}>Add document</button></div>
            <label className="field"><span>Title</span><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <label className="field"><span>Category</span><input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} /></label>
            <label className="field"><span>Body</span><textarea rows={10} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} /></label>
            <div className="analysis-preview"><span>Analysis preview</span><div>{analyze(`${draft.title} ${draft.body}`, settings.removeStopWords).tokens.slice(0, 18).map((token) => <code key={`${token.position}-${token.term}`}>{token.term}</code>)}</div></div>
            <div className="drawer-actions"><button className="solid-button" onClick={saveDocument}>{draft.isNew ? 'Add and reindex' : 'Save and reindex'}</button>{!draft.isNew && <button className="danger-button" onClick={deleteDocument}>Delete document</button>}</div>
            <button className="restore-button" onClick={resetAll} disabled={!corpusChanged}>↺ Restore original corpus</button>
          </aside>
        </div>
      )}
    </main>
  );
}

function AnalyzeStage({ response, activeTerm, onTerm }: { response: ReturnType<SearchEngine['search']>; activeTerm: string | null; onTerm: (term: string | null) => void }) {
  return (
    <div>
      <p className="stage-kicker">Original query</p><blockquote>{response.query || 'No query'}</blockquote>
      <p className="stage-kicker">Token stream</p>
      <div className="stage-tokens">{response.analysis.allTokens.map((token) => <code className={`${token.removed ? 'discarded' : ''} ${activeTerm === token.term ? 'active-term' : ''}`} key={`${token.position}-${token.term}`} onMouseEnter={() => onTerm(token.term)} onMouseLeave={() => onTerm(null)}>{token.term}<small>{token.start}:{token.end}</small></code>)}</div>
      <p className="stage-note">NFKC Unicode normalization and lowercase matching preserve original character offsets for highlighting. {response.analysis.removedTokens.length ? `${response.analysis.removedTokens.length} stop word token${response.analysis.removedTokens.length === 1 ? ' was' : 's were'} discarded.` : 'No tokens were discarded.'}</p>
    </div>
  );
}

function RetrieveStage({ response, documents, matchMode, activeTerm, onTerm }: { response: ReturnType<SearchEngine['search']>; documents: SearchDocument[]; matchMode: SearchSettings['matchMode']; activeTerm: string | null; onTerm: (term: string | null) => void }) {
  return (
    <div>
      <p className="stage-kicker">Posting lists</p>
      <div className="retrieval-list">{response.retrieval.map((item) => <button key={item.term} className={activeTerm === item.term ? 'active' : ''} onMouseEnter={() => onTerm(item.term)} onMouseLeave={() => onTerm(null)} onClick={() => document.getElementById('index')?.scrollIntoView({ behavior: 'smooth' })}><code>{item.term}</code><span>df {item.documentFrequency}</span><small>{item.postings.slice(0, 3).map((posting) => documents.find((document) => document.id === posting.documentId)?.title).join(' · ') || 'not in vocabulary'}</small></button>)}</div>
      <p className="stage-kicker">Candidate union</p><div className="candidate-list">{response.candidateDocumentIds.slice(0, 10).map((id) => <code key={id}>{id}</code>)}{response.candidateDocumentIds.length > 10 && <span>+{response.candidateDocumentIds.length - 10}</span>}</div>
      <p className="stage-note">{response.queryTerms.length} unique query term{response.queryTerms.length === 1 ? '' : 's'} are counted once. {response.candidateDocumentIds.length} documents enter {response.queryTerms.length > 1 ? `${response.queryTerms.length} posting lists` : 'the posting list'} before {response.results.length} survive {matchMode} matching.</p>
    </div>
  );
}

function ScoreStage({ result, activeTerm, onTerm }: { result?: SearchResult; activeTerm: string | null; onTerm: (term: string | null) => void }) {
  if (!result) return <div className="stage-note">Select a ranked result to inspect its score.</div>;
  return (
    <div>
      <p className="stage-kicker">Selected document</p><h3 className="stage-title">{result.document.title}</h3>
      <div className="score-total"><span>final score</span><strong>{number(result.score, 4)}</strong><small>{number(result.explanation.titleScore, 3)} title + {number(result.explanation.bodyScore, 3)} body</small></div>
      <div className="contribution-list">{result.explanation.contributions.map((item) => <div className={activeTerm === item.term ? 'active contribution' : 'contribution'} key={`${item.term}-${item.field}`} onMouseEnter={() => onTerm(item.term)} onMouseLeave={() => onTerm(null)}><div><code>{item.term}</code><b>{item.field}</b><strong>+{number(item.contribution, 3)}</strong></div><p>tf {item.tf} · df {item.df} · idf {number(item.idf, 3)} · len {item.documentLength}/{number(item.averageFieldLength, 1)} · weight {number(item.fieldWeight, 1)}</p></div>)}</div>
      <p className="stage-note">Every contribution above is returned by the ranking engine. Their sum equals the final score.</p>
    </div>
  );
}

function RankStage({ results, selectedId, onSelect }: { results: SearchResult[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div><p className="stage-kicker">Final ordering</p><div className="mini-ranking">{results.slice(0, 8).map((result, index) => <button className={result.document.id === selectedId ? 'active' : ''} key={result.document.id} onClick={() => onSelect(result.document.id)}><span>{index + 1}</span><b>{result.document.title}</b><code>{number(result.score, 2)}</code></button>)}</div>{results.length > 1 && <p className="stage-note">The winner leads by {number(results[0].score - results[1].score, 3)}. Equal scores break by stable document ID.</p>}</div>
  );
}

function Comparison({ results, b, stats, activeTerm, onTerm }: { results: [SearchResult, SearchResult]; b: number; stats: ReturnType<SearchEngine['getStats']>; activeTerm: string | null; onTerm: (term: string | null) => void }) {
  const [left, right] = results;
  const winner = left.score >= right.score ? left : right;
  const loser = winner === left ? right : left;
  const leftTerms = new Set(left.explanation.matchedTerms);
  const rightTerms = new Set(right.explanation.matchedTerms);
  const shared = [...leftTerms].filter((term) => rightTerms.has(term));
  const leftOnly = [...leftTerms].filter((term) => !rightTerms.has(term));
  const rightOnly = [...rightTerms].filter((term) => !leftTerms.has(term));
  const occurrences = (result: SearchResult) => result.explanation.contributions.reduce((sum, item) => sum + item.tf, 0);
  const max = Math.max(left.score, right.score, 0.01);
  const leftLength = stats.documentLengths[left.document.id]?.body ?? 0;
  const rightLength = stats.documentLengths[right.document.id]?.body ?? 0;
  return (
    <div>
      <div className="comparison-grid">{results.map((result) => <article key={result.document.id} className={winner.document.id === result.document.id ? 'winner' : ''}><span className="comparison-badge">{winner.document.id === result.document.id ? 'Current winner' : 'Runner-up'}</span><h3>{result.document.title}</h3><strong className="comparison-score">{number(result.score, 3)}</strong><div className="split-bar"><i className="title-bar" style={{ width: `${(result.explanation.titleScore / max) * 100}%` }} /><i className="body-bar" style={{ width: `${(result.explanation.bodyScore / max) * 100}%` }} /></div><dl><div><dt>title</dt><dd>{number(result.explanation.titleScore, 3)}</dd></div><div><dt>body</dt><dd>{number(result.explanation.bodyScore, 3)}</dd></div><div><dt>matched occurrences</dt><dd>{occurrences(result)}</dd></div><div><dt>body length</dt><dd>{stats.documentLengths[result.document.id]?.body ?? 0}</dd></div></dl></article>)}</div>
      <div className="term-venn"><div><span>Only left</span>{leftOnly.length ? leftOnly.map((term) => <code key={term}>{term}</code>) : <small>none</small>}</div><div><span>Shared terms</span>{shared.map((term) => <code className={activeTerm === term ? 'active-term' : ''} key={term} onMouseEnter={() => onTerm(term)} onMouseLeave={() => onTerm(null)}>{term}</code>)}</div><div><span>Only right</span>{rightOnly.length ? rightOnly.map((term) => <code key={term}>{term}</code>) : <small>none</small>}</div></div>
      <div className="plain-explanation"><strong>{winner.document.title} leads by {number(winner.score - loser.score, 3)}.</strong><p>At the current weights, its title contributes {number(winner.explanation.titleScore, 3)} and its body contributes {number(winner.explanation.bodyScore, 3)}. The other document receives {number(loser.explanation.titleScore, 3)} from its title and {number(loser.explanation.bodyScore, 3)} from its body.</p><p>{left.document.title} records {occurrences(left)} matched occurrence{occurrences(left) === 1 ? '' : 's'}; {right.document.title} records {occurrences(right)}. With b at {number(b, 2)}, their measured body lengths are {leftLength} and {rightLength} tokens. Move the controls to see these exact contributions recompute.</p></div>
    </div>
  );
}
