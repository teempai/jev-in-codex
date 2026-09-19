import { Jev, lexicalScore } from './jev.js';
import { excerpts, Workspace, type Excerpt, InputError } from './workspace.js';

export class Service {
  constructor(private readonly workspace: Workspace, private readonly jev: Jev) {}

  async select(objective: string, candidates: { id: string; kind: 'tool' | 'skill'; description: string }[], limit: number) {
    if (new Set(candidates.map(item => item.id)).size !== candidates.length) throw new InputError('Capability IDs must be unique.');
    const { ranked, ...metadata } = await this.jev.rank(objective, candidates.map(item => ({ id: item.id, text: `${item.kind}: ${item.id}\n${item.description}` })));
    const threshold = metadata.method === 'jev' ? 0.5 : 0;
    const matches = ranked.filter(item => metadata.method === 'jev' ? item.score >= threshold : item.score > threshold);
    return { ...metadata, candidates_evaluated: candidates.length,
      recommendation: matches[0]?.id ?? null,
      results: matches.slice(0, limit).map(item => ({ ...candidates.find(candidate => candidate.id === item.id)!, score: item.score })),
      omitted_results: matches.length - Math.min(matches.length, limit),
      advisory: 'A relevance ranking, not permission to execute. Scores are not calibrated guarantees.' };
  }

  private async rankExcerpts(question: string, items: Excerpt[], limit: number) {
    const { ranked, ...metadata } = await this.jev.rank(question, items.map(item => ({ id: item.id, text: `${item.path}:${item.start_line}-${item.end_line}\n${item.text}` })));
    return { ...metadata, results: ranked.slice(0, limit).map(item => ({ ...items.find(excerpt => excerpt.id === item.id)!, score: item.score })),
      omitted_results: Math.max(0, ranked.length - limit) };
  }

  async search(question: string, scope: string[], queryTerms: string[], limit: number) {
    const { candidates, coverage } = await this.workspace.search(question, scope, queryTerms);
    return { ...(await this.rankExcerpts(question, candidates, limit)), coverage,
      advisory: 'Search covers a bounded lexical shortlist. No matches does not establish absence; broaden query_terms or scope.' };
  }

  async triage(question: string, artifactPath: string, startLine: number, endLine: number | undefined, limit: number) {
    const text = await this.workspace.read(artifactPath);
    const chunks = excerpts(artifactPath, text, startLine, endLine);
    const groups = new Map<string, Excerpt & { occurrences: { start_line: number; end_line: number }[] }>();
    for (const chunk of chunks) {
      const existing = groups.get(chunk.text);
      if (existing) existing.occurrences.push({ start_line: chunk.start_line, end_line: chunk.end_line });
      else groups.set(chunk.text, { ...chunk, occurrences: [{ start_line: chunk.start_line, end_line: chunk.end_line }] });
    }
    const unique = [...groups.values()];
    const shortlisted = unique.length <= 24 ? unique : unique.sort((a, b) =>
      lexicalScore(question, b.text) - lexicalScore(question, a.text)).slice(0, 24);
    const ranked = await this.rankExcerpts(question, shortlisted, limit);
    return { ...ranked,
      results: ranked.results.map(item => {
        const locations = groups.get(item.text)!.occurrences;
        return { ...item, occurrences: locations.slice(0, 20), occurrence_count: locations.length,
          omitted_occurrences: Math.max(0, locations.length - 20) };
      }),
      artifact_path: artifactPath,
      coverage: { total_lines: text === '' ? 0 : text.split('\n').length - Number(text.endsWith('\n')),
        start_line: startLine, end_line: chunks.at(-1)?.end_line ?? 0,
        chunks_in_range: chunks.length, unique_chunks: unique.length, chunks_evaluated: shortlisted.length,
        chunks_not_evaluated: unique.length - shortlisted.length,
        preselection: unique.length > 24 ? 'lexical' : 'all' },
      advisory: 'Original excerpts, not a complete diagnosis. Only identical chunks are grouped. Read surrounding lines and the full artifact before concluding.' };
  }
}
