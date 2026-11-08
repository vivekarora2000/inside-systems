export type SearchDocument = {
  id: string;
  title: string;
  category: string;
  body: string;
};

export type AnalyzedToken = {
  term: string;
  original: string;
  position: number;
  start: number;
  end: number;
  removed: boolean;
};

export type Analysis = {
  original: string;
  allTokens: AnalyzedToken[];
  tokens: AnalyzedToken[];
  removedTokens: AnalyzedToken[];
};

export type SearchSettings = {
  titleWeight: number;
  k1: number;
  b: number;
  removeStopWords: boolean;
  matchMode: 'OR' | 'AND';
};

export type FieldName = 'title' | 'body';
export type FieldPosting = { tf: number; positions: number[] };
export type Posting = {
  documentId: string;
  title?: FieldPosting;
  body?: FieldPosting;
};

export type TermContribution = {
  term: string;
  field: FieldName;
  tf: number;
  df: number;
  idf: number;
  documentLength: number;
  averageFieldLength: number;
  fieldWeight: number;
  rawBm25: number;
  contribution: number;
};

export type ResultExplanation = {
  matchedTerms: string[];
  contributions: TermContribution[];
  titleScore: number;
  bodyScore: number;
  finalScore: number;
};

export type SearchResult = {
  document: SearchDocument;
  score: number;
  explanation: ResultExplanation;
};

export type RetrievalTerm = {
  term: string;
  documentFrequency: number;
  postings: Posting[];
};

export type SearchResponse = {
  query: string;
  analysis: Analysis;
  queryTerms: string[];
  retrieval: RetrievalTerm[];
  candidateDocumentIds: string[];
  results: SearchResult[];
  suggestions: Record<string, string[]>;
  elapsedMs: number;
};

export type IndexStats = {
  corpusSize: number;
  vocabularySize: number;
  averageFieldLengths: Record<FieldName, number>;
  documentLengths: Record<string, Record<FieldName, number>>;
  documentFrequencies: Record<string, number>;
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from', 'has',
  'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was',
  'were', 'will', 'with',
]);

export const DEFAULT_SETTINGS: SearchSettings = {
  titleWeight: 2.4,
  k1: 1.2,
  b: 0.75,
  removeStopWords: true,
  matchMode: 'OR',
};

export function analyze(text: string, removeStopWords = true): Analysis {
  const allTokens: AnalyzedToken[] = [];
  const matcher = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
  let match: RegExpExecArray | null;
  let position = 0;

  while ((match = matcher.exec(text)) !== null) {
    const term = match[0].normalize('NFKC').toLocaleLowerCase('en');
    allTokens.push({
      term,
      original: match[0],
      position,
      start: match.index,
      end: match.index + match[0].length,
      removed: removeStopWords && STOP_WORDS.has(term),
    });
    position += 1;
  }

  return {
    original: text,
    allTokens,
    tokens: allTokens.filter((token) => !token.removed),
    removedTokens: allTokens.filter((token) => token.removed),
  };
}

function boundedEditDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= b.length; j += 1) {
      const value = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

function safeNumber(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export class SearchEngine {
  private documents: SearchDocument[] = [];
  private settings: SearchSettings;
  private postings = new Map<string, Map<string, Posting>>();
  private lengths = new Map<string, Record<FieldName, number>>();
  private averages: Record<FieldName, number> = { title: 0, body: 0 };
  private vocabulary = new Set<string>();

  constructor(documents: SearchDocument[], settings: Partial<SearchSettings> = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.replaceDocuments(documents);
  }

  replaceDocuments(documents: SearchDocument[]): void {
    this.documents = documents.map((document) => ({ ...document }));
    this.build();
  }

  upsertDocument(document: SearchDocument): void {
    const index = this.documents.findIndex((item) => item.id === document.id);
    if (index === -1) this.documents.push({ ...document });
    else this.documents[index] = { ...document };
    this.build();
  }

  deleteDocument(documentId: string): boolean {
    const before = this.documents.length;
    this.documents = this.documents.filter((document) => document.id !== documentId);
    if (this.documents.length === before) return false;
    this.build();
    return true;
  }

  getDocuments(): SearchDocument[] {
    return this.documents.map((document) => ({ ...document }));
  }

  getPostings(term: string): Posting[] {
    const normalized = analyze(term, false).tokens[0]?.term ?? '';
    return [...(this.postings.get(normalized)?.values() ?? [])]
      .map((posting) => ({
        documentId: posting.documentId,
        title: posting.title ? { tf: posting.title.tf, positions: [...posting.title.positions] } : undefined,
        body: posting.body ? { tf: posting.body.tf, positions: [...posting.body.positions] } : undefined,
      }))
      .sort((a, b) => a.documentId.localeCompare(b.documentId));
  }

  getStats(): IndexStats {
    const documentLengths: IndexStats['documentLengths'] = {};
    for (const [documentId, lengths] of this.lengths) documentLengths[documentId] = { ...lengths };
    const documentFrequencies: Record<string, number> = {};
    for (const [term, postings] of this.postings) documentFrequencies[term] = postings.size;
    return {
      corpusSize: this.documents.length,
      vocabularySize: this.vocabulary.size,
      averageFieldLengths: { ...this.averages },
      documentLengths,
      documentFrequencies,
    };
  }

  private build(): void {
    this.postings.clear();
    this.lengths.clear();
    this.vocabulary.clear();
    const totals = { title: 0, body: 0 };

    for (const document of this.documents) {
      const lengths = { title: 0, body: 0 };
      for (const field of ['title', 'body'] as const) {
        const analysis = analyze(document[field], this.settings.removeStopWords);
        lengths[field] = analysis.tokens.length;
        totals[field] += analysis.tokens.length;
        const grouped = new Map<string, number[]>();
        for (const token of analysis.tokens) {
          grouped.set(token.term, [...(grouped.get(token.term) ?? []), token.position]);
        }
        for (const [term, positions] of grouped) {
          this.vocabulary.add(term);
          const termPostings = this.postings.get(term) ?? new Map<string, Posting>();
          const posting = termPostings.get(document.id) ?? { documentId: document.id };
          posting[field] = { tf: positions.length, positions };
          termPostings.set(document.id, posting);
          this.postings.set(term, termPostings);
        }
      }
      this.lengths.set(document.id, lengths);
    }

    const divisor = this.documents.length || 1;
    this.averages = { title: totals.title / divisor, body: totals.body / divisor };
  }

  search(query: string, overrides: Partial<SearchSettings> = {}): SearchResponse {
    const started = typeof performance === 'undefined' ? Date.now() : performance.now();
    const settings = { ...this.settings, ...overrides };
    if (settings.removeStopWords !== this.settings.removeStopWords) {
      return new SearchEngine(this.documents, settings).search(query);
    }

    const analysis = analyze(query, settings.removeStopWords);
    const queryTerms = [...new Set(analysis.tokens.map((token) => token.term))];
    const retrieval: RetrievalTerm[] = queryTerms.map((term) => ({
      term,
      documentFrequency: this.postings.get(term)?.size ?? 0,
      postings: this.getPostings(term),
    }));
    const candidateSet = new Set<string>();
    for (const item of retrieval) for (const posting of item.postings) candidateSet.add(posting.documentId);
    const candidateDocumentIds = [...candidateSet].sort();

    if (queryTerms.length === 0) {
      return {
        query,
        analysis,
        queryTerms,
        retrieval,
        candidateDocumentIds,
        results: [],
        suggestions: {},
        elapsedMs: 0,
      };
    }

    const eligible = candidateDocumentIds.filter((documentId) => (
      settings.matchMode === 'OR'
      || queryTerms.every((term) => this.postings.get(term)?.has(documentId))
    ));

    const results: SearchResult[] = eligible.map((documentId) => {
      const document = this.documents.find((item) => item.id === documentId)!;
      const contributions: TermContribution[] = [];

      for (const term of queryTerms) {
        const termPostings = this.postings.get(term);
        const posting = termPostings?.get(documentId);
        const df = termPostings?.size ?? 0;
        const idf = safeNumber(Math.log(1 + (this.documents.length - df + 0.5) / (df + 0.5)));

        for (const field of ['title', 'body'] as const) {
          const tf = posting?.[field]?.tf ?? 0;
          if (tf === 0) continue;
          const documentLength = this.lengths.get(documentId)?.[field] ?? 0;
          const averageFieldLength = this.averages[field];
          const lengthRatio = averageFieldLength > 0 ? documentLength / averageFieldLength : 0;
          const denominator = tf + settings.k1 * (1 - settings.b + settings.b * lengthRatio);
          const rawBm25 = safeNumber(denominator > 0 ? idf * ((tf * (settings.k1 + 1)) / denominator) : 0);
          const fieldWeight = field === 'title' ? settings.titleWeight : 1;
          contributions.push({
            term,
            field,
            tf,
            df,
            idf,
            documentLength,
            averageFieldLength,
            fieldWeight,
            rawBm25,
            contribution: safeNumber(rawBm25 * fieldWeight),
          });
        }
      }

      const titleScore = contributions.filter((item) => item.field === 'title').reduce((sum, item) => sum + item.contribution, 0);
      const bodyScore = contributions.filter((item) => item.field === 'body').reduce((sum, item) => sum + item.contribution, 0);
      const finalScore = safeNumber(titleScore + bodyScore);
      return {
        document,
        score: finalScore,
        explanation: {
          matchedTerms: queryTerms.filter((term) => this.postings.get(term)?.has(documentId)),
          contributions,
          titleScore,
          bodyScore,
          finalScore,
        },
      };
    }).sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id));

    const suggestions: Record<string, string[]> = {};
    for (const term of queryTerms.filter((item) => !this.postings.has(item))) {
      const limit = term.length <= 4 ? 1 : 2;
      suggestions[term] = [...this.vocabulary]
        .map((candidate) => ({ candidate, distance: boundedEditDistance(term, candidate, limit) }))
        .filter((item) => item.distance <= limit)
        .sort((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate))
        .slice(0, 3)
        .map((item) => item.candidate);
    }

    const ended = typeof performance === 'undefined' ? Date.now() : performance.now();
    return {
      query,
      analysis,
      queryTerms,
      retrieval,
      candidateDocumentIds,
      results,
      suggestions,
      elapsedMs: Math.max(0, ended - started),
    };
  }
}
