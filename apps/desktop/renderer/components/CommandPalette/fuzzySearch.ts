/**
 * Fuzzy Search Utility
 *
 * Simple fuzzy string matching algorithm for command palette search.
 * Supports basic substring matching with scoring.
 */

/**
 * Fuzzy search result
 */
export interface FuzzyMatch {
  /**
   * Relevance score (higher is better)
   */
  score: number;

  /**
   * Indices of matching characters in the target string
   */
  matchedIndices: number[];
}

/**
 * Perform fuzzy search on a string
 *
 * Algorithm:
 * - Consecutive character matches score higher
 * - Matches at word boundaries score higher
 * - Case-insensitive matching
 * - Early matches score higher
 *
 * @param query Search query
 * @param target Target string to search in
 * @returns Fuzzy match result or null if no match
 */
export function fuzzySearch(query: string, target: string): FuzzyMatch | null {
  if (!query) {
    return { score: 0, matchedIndices: [] };
  }

  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  let queryIndex = 0;
  let targetIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;
  const matchedIndices: number[] = [];

  // Try to match all characters in query
  while (queryIndex < queryLower.length && targetIndex < targetLower.length) {
    if (queryLower[queryIndex] === targetLower[targetIndex]) {
      matchedIndices.push(targetIndex);

      // Consecutive match bonus
      consecutiveMatches++;
      score += 1 + consecutiveMatches;

      // Word boundary bonus (character after space or at start)
      if (targetIndex === 0 || target[targetIndex - 1] === ' ') {
        score += 5;
      }

      // Early match bonus
      const earlyBonus = Math.max(0, 10 - targetIndex);
      score += earlyBonus;

      queryIndex++;
      targetIndex++;
    } else {
      consecutiveMatches = 0;
      targetIndex++;
    }
  }

  // All query characters must match
  if (queryIndex < queryLower.length) {
    return null;
  }

  return { score, matchedIndices };
}

/**
 * Filter and sort items by fuzzy search relevance
 *
 * @param query Search query
 * @param items Items to search
 * @param getText Function to extract searchable text from item
 * @returns Filtered and sorted items with scores
 */
export function fuzzyFilter<T>(
  query: string,
  items: T[],
  getText: (item: T) => string
): Array<{ item: T; score: number; matchedIndices: number[] }> {
  const results = items
    .map((item) => {
      const text = getText(item);
      const match = fuzzySearch(query, text);
      if (!match) return null;
      return { item, score: match.score, matchedIndices: match.matchedIndices };
    })
    .filter((result): result is NonNullable<typeof result> => result !== null);

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Highlight matched characters in a string
 *
 * @param text Original text
 * @param matchedIndices Indices of matched characters
 * @returns Array of { text: string, highlighted: boolean } segments
 */
export function highlightMatches(
  text: string,
  matchedIndices: number[]
): Array<{ text: string; highlighted: boolean }> {
  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let currentSegment = '';
  let isHighlighted = false;

  const matchSet = new Set(matchedIndices);

  for (let i = 0; i < text.length; i++) {
    const shouldHighlight = matchSet.has(i);

    if (shouldHighlight !== isHighlighted) {
      // Transition - save current segment and start new one
      if (currentSegment) {
        segments.push({ text: currentSegment, highlighted: isHighlighted });
      }
      currentSegment = text[i];
      isHighlighted = shouldHighlight;
    } else {
      // Continue current segment
      currentSegment += text[i];
    }
  }

  // Save last segment
  if (currentSegment) {
    segments.push({ text: currentSegment, highlighted: isHighlighted });
  }

  return segments;
}
