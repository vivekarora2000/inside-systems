# Inside Search

Inside Search is an interactive, browser-based search lab. Search a bundled fictional city, follow the query into a real inverted index, inspect every BM25 contribution, change ranking rules, compare results, and edit the corpus while the index rebuilds.

The project is deliberately lexical. It does not use an API, backend, embeddings, synonyms, stemming, or an explanation model.

## Run it

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Engine architecture

`app/search-engine.ts` is a typed TypeScript module with no React dependency. It:

1. tokenizes Unicode text with NFKC normalization and lowercase matching;
2. preserves original positions and character offsets while reporting removed stop words;
3. builds an inverted index with per-field term frequency and token positions;
4. tracks title/body lengths, average field lengths, document frequencies, vocabulary size, and corpus size;
5. retrieves candidates with OR or AND matching;
6. scores title and body independently with BM25; and
7. returns the same structured evidence the interface renders.

The corpus lives in `app/corpus.ts`. Runtime edits create a new engine from the edited documents, so every posting list and statistic is derived again rather than patched in the UI.

## Ranking choices

The final score is a weighted sum of per-field BM25 scores:

```text
score(d,q) = titleWeight × BM25_title(d,q) + 1 × BM25_body(d,q)
```

IDF uses the nonnegative formula:

```text
ln(1 + (N - df + 0.5) / (df + 0.5))
```

Query terms count once. Body weight is fixed at 1. Ties break by document ID. This is intentionally not called BM25F: it is a weighted sum of independently normalized title and body BM25 contributions.

Current limitations are explicit: no stemming, phrase queries, field syntax, synonym expansion, semantic retrieval, persistence, or custom-corpus link sharing.

## Explanations stay honest

Each result contains term/field contributions with TF, DF, IDF, document length, average field length, field weight, raw BM25, and weighted contribution. The interface never recomputes ranking logic; it only displays that returned explanation. Tests assert that displayed contributions sum to the engine’s final score.

## Add a guided experiment

Add an entry to `EXPERIMENTS` in `app/corpus.ts` with:

- a query;
- a settings patch;
- two real document IDs to compare; and
- one concrete action for the visitor.

Then add or adjust corpus documents so the intended observation emerges from the engine. Add a test in `app/search-engine.test.ts` that verifies the behavior instead of assuming the ranking.

## Deploy

`npm run build` produces the Cloudflare Worker-compatible Sites output in `dist/`. The included `.openai/hosting.json` is ready for OpenAI Sites. For another static host, serve an equivalent Vite/React build with client-side query-string support and ensure `/og.png` and `/favicon.svg` are public.
