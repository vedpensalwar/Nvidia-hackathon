import { ResearchSource } from './schema';

/**
 * Normalizes text for deterministic quote provenance checking:
 * 1. Unicode decomposition / canonicalization
 * 2. Smart single & double quotes to standard ASCII
 * 3. Typographical dashes and hyphens to standard ASCII hyphen
 * 4. Line breaks, carriage returns, tabs, non-breaking spaces collapsed to single ASCII space
 * 5. Lowercased for case-insensitive verification
 */
export function normalizeForMatching(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFKD')
    // Smart double quotes and angle quotes
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB\u2033\u2036]/g, '"')
    // Smart single quotes and apostrophes
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    // Dashes, en-dashes, em-dashes, minus signs
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    // Non-breaking spaces and other special spaces
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Collapse any whitespace, line breaks, carriage returns, tabs
    .replace(/[\r\n\t\v\f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalizes URLs for lenient equality checking (handling protocol, www, and trailing slash)
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

/**
 * Verifies whether a candidate URL is present in the allowlisted retrieved sources.
 */
export function isUrlAllowlisted(
  candidateUrl: string,
  retrievedSources: ResearchSource[]
): { isAllowed: boolean; matchedSource: ResearchSource | null } {
  const normCandidate = normalizeUrl(candidateUrl);
  if (!normCandidate) {
    return { isAllowed: false, matchedSource: null };
  }

  const matched = retrievedSources.find((s) => {
    const normSource = normalizeUrl(s.url);
    if (!normSource) return false;
    return (
      normSource === normCandidate ||
      normSource.split('#')[0].split('?')[0] === normCandidate.split('#')[0].split('?')[0] ||
      (normCandidate.length > 8 && normSource.includes(normCandidate)) ||
      (normSource.length > 8 && normCandidate.includes(normSource))
    );
  });

  return {
    isAllowed: Boolean(matched),
    matchedSource: matched || null,
  };
}

export interface ProvenanceCheckResult {
  isValid: boolean;
  matchType: 'EXACT' | 'NORMALIZED' | 'NOT_FOUND';
  sourceUrlValid: boolean;
  matchedSourceUrl: string | null;
  details: string;
}

/**
 * Deterministically checks whether candidateQuote actually exists inside the content of matched source.
 * Code verifies provenance - no model hallucination allowed.
 */
export function checkQuoteProvenance(
  candidateQuote: string,
  candidateSourceUrl: string,
  retrievedSources: ResearchSource[]
): ProvenanceCheckResult {
  const trimmedQuote = (candidateQuote || '').trim();
  const trimmedUrl = (candidateSourceUrl || '').trim();

  if (!trimmedQuote) {
    return {
      isValid: false,
      matchType: 'NOT_FOUND',
      sourceUrlValid: false,
      matchedSourceUrl: null,
      details: 'Candidate evidence quote is empty.',
    };
  }

  // 1. Verify source URL against retrieved source set via allowlisting
  const { isAllowed, matchedSource } = isUrlAllowlisted(trimmedUrl, retrievedSources);
  const sourceUrlValid = isAllowed;

  // If source URL isn't in our retrieved sources, fail immediately
  if (!matchedSource) {
    return {
      isValid: false,
      matchType: 'NOT_FOUND',
      sourceUrlValid: false,
      matchedSourceUrl: null,
      details: `Source URL "${trimmedUrl}" does not match any of the ${retrievedSources.length} retrieved research sources.`,
    };
  }

  // 2. Check quote in source text (verbatim check first)
  const fullSourceText = `${matchedSource.snippet}\n${matchedSource.content || ''}`;

  if (fullSourceText.includes(trimmedQuote)) {
    return {
      isValid: true,
      matchType: 'EXACT',
      sourceUrlValid: true,
      matchedSourceUrl: matchedSource.url,
      details: `Verbatim quote found in source "${matchedSource.title}".`,
    };
  }

  // 3. Check normalized match (handles Unicode, smart quotes, dashes, whitespace collapses, line breaks)
  const normalizedCandidate = normalizeForMatching(trimmedQuote);
  const normalizedSource = normalizeForMatching(fullSourceText);

  if (normalizedCandidate.length > 0 && normalizedSource.includes(normalizedCandidate)) {
    return {
      isValid: true,
      matchType: 'NORMALIZED',
      sourceUrlValid: true,
      matchedSourceUrl: matchedSource.url,
      details: `Normalized quote matched in source "${matchedSource.title}" (accounting for typographical quotes, line breaks, and whitespace).`,
    };
  }

  // Also check if candidate quote is slightly longer than the snippet or split across sentences
  // If it's not found in the designated source, check if it appeared in ANY of the retrieved sources
  for (const otherSource of retrievedSources) {
    if (otherSource.url === matchedSource.url) continue;
    const otherText = `${otherSource.snippet}\n${otherSource.content || ''}`;
    if (otherText.includes(trimmedQuote)) {
      return {
        isValid: false,
        matchType: 'NOT_FOUND',
        sourceUrlValid: false,
        matchedSourceUrl: otherSource.url,
        details: `Quote appeared in a different source ("${otherSource.title}") than the cited URL. Provenance rejected for URL mismatch.`,
      };
    }
  }

  return {
    isValid: false,
    matchType: 'NOT_FOUND',
    sourceUrlValid: true,
    matchedSourceUrl: matchedSource.url,
    details: `Evidence quote was not found in the retrieved text from "${matchedSource.title}". Provenance failed.`,
  };
}
