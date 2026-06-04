export interface FuzzyResult {
  matched: boolean;
  score: number;
  /** Indices of matched characters in the target, for highlighting. */
  indices: number[];
}

/**
 * Subsequence fuzzy match. Rewards consecutive runs and start-of-word hits so
 * "db in" ranks "Database Inline" above incidental matches.
 *
 * This is intentionally self-contained so TabPicker works out of the box. If
 * you already have a matcher behind your command palette, pass it via the
 * `fuzzy` prop instead and delete this file — the shapes are compatible as
 * long as it returns { matched, score, indices }.
 */
export function fuzzyMatch(query: string, target: string): FuzzyResult {
  const q = query.trim().toLowerCase();
  if (!q) return { matched: true, score: 0, indices: [] };

  const t = target.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  let score = 0;
  let lastHit = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;

    indices.push(ti);
    score += lastHit === ti - 1 ? 5 : 1; // consecutive run bonus
    if (ti === 0 || /\s/.test(t[ti - 1])) score += 3; // word-start bonus
    lastHit = ti;
    qi++;
  }

  return qi === q.length
    ? { matched: true, score, indices }
    : { matched: false, score: 0, indices: [] };
}
