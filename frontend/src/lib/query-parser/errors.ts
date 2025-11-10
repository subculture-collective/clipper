/**
 * Error handling for the Clipper Query Language parser
 * Provides helpful error messages and suggestions
 */

import type { Position, SourceLocation } from './ast';

/**
 * Error codes as defined in RFC 002
 */
export enum QueryErrorCode {
  INVALID_FILTER_NAME = 'QE001',
  MISSING_FILTER_VALUE = 'QE002',
  INVALID_DATE_FORMAT = 'QE003',
  INVALID_RANGE = 'QE004',
  UNCLOSED_QUOTE = 'QE005',
  INVALID_COMPARISON_OPERATOR = 'QE006',
  QUERY_TOO_LONG = 'QE007',
  TOO_MANY_FILTERS = 'QE008',
  NESTING_TOO_DEEP = 'QE009',
  INVALID_ENUM_VALUE = 'QE010',
  TOO_MANY_OR_CLAUSES = 'QE011',
  TOO_MANY_TERMS = 'QE012',
}

/**
 * Query parsing error with helpful suggestions
 */
export class QueryParseError extends Error {
  code: QueryErrorCode;
  position?: Position;
  location?: SourceLocation;
  suggestions: string[];

  constructor(
    code: QueryErrorCode,
    message: string,
    position?: Position,
    location?: SourceLocation,
    suggestions: string[] = []
  ) {
    super(message);
    this.name = 'QueryParseError';
    this.code = code;
    this.position = position;
    this.location = location;
    this.suggestions = suggestions;
  }

  /**
   * Format error for display
   */
  format(): string {
    let formatted = `${this.code}: ${this.message}`;

    if (this.position) {
      formatted += ` at line ${this.position.line}, column ${this.position.column}`;
    }

    if (this.suggestions.length > 0) {
      formatted += '\n\nSuggestions:';
      this.suggestions.forEach(suggestion => {
        formatted += `\n  - ${suggestion}`;
      });
    }

    return formatted;
  }

  /**
   * Get a structured error response
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      position: this.position,
      location: this.location,
      suggestions: this.suggestions,
    };
  }
}

/**
 * Create error for invalid filter name
 */
export function createInvalidFilterNameError(
  name: string,
  position?: Position
): QueryParseError {
  const suggestions = [
    'Valid filters: game, creator, broadcaster, tag, language, duration, views, votes, after, before, is, sort, type, karma, role',
    `Did you mean to search for "${name}"? Use quotes if this is a search term.`,
  ];

  // Try to suggest a similar filter name
  const similarFilter = findSimilarFilterName(name);
  if (similarFilter) {
    suggestions.unshift(`Did you mean "${similarFilter}:"?`);
  }

  return new QueryParseError(
    QueryErrorCode.INVALID_FILTER_NAME,
    `Unknown filter: "${name}"`,
    position,
    undefined,
    suggestions
  );
}

/**
 * Create error for missing filter value
 */
export function createMissingFilterValueError(
  filterName: string,
  position?: Position
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.MISSING_FILTER_VALUE,
    `Filter "${filterName}" requires a value`,
    position,
    undefined,
    [
      `Usage: ${filterName}:value`,
      `Example: ${getFilterExample(filterName)}`,
    ]
  );
}

/**
 * Create error for invalid date format
 */
export function createInvalidDateFormatError(
  date: string,
  position?: Position
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.INVALID_DATE_FORMAT,
    `Invalid date format: "${date}"`,
    position,
    undefined,
    [
      'Use YYYY-MM-DD format (ISO 8601 date), e.g., 2025-01-15',
      'Or use relative dates: today, yesterday, last-week, last-month, last-year',
      `Example: after:2025-01-01 or after:yesterday`,
    ]
  );
}

/**
 * Create error for invalid range
 */
export function createInvalidRangeError(
  min: number,
  max: number,
  position?: Position
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.INVALID_RANGE,
    `Invalid range: minimum (${min}) is greater than maximum (${max})`,
    position,
    undefined,
    [
      'Range format: min..max (e.g., 10..100)',
      'Or use comparison: >10, >=10, <100, <=100',
    ]
  );
}

/**
 * Create error for unclosed quote
 */
export function createUnclosedQuoteError(
  position?: Position
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.UNCLOSED_QUOTE,
    'Unclosed quote in query',
    position,
    undefined,
    [
      'Ensure all quotes are properly closed',
      'Use backslash to escape quotes within strings: game:"League of \\"Legends\\""',
    ]
  );
}

/**
 * Create error for invalid comparison operator
 */
export function createInvalidComparisonOperatorError(
  operator: string,
  position?: Position
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.INVALID_COMPARISON_OPERATOR,
    `Invalid comparison operator: "${operator}"`,
    position,
    undefined,
    [
      'Valid operators: >, >=, <, <=, =',
      'Example: votes:>10, duration:<=60',
    ]
  );
}

/**
 * Create error for query too long
 */
export function createQueryTooLongError(
  length: number,
  maxLength: number = 1000
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.QUERY_TOO_LONG,
    `Query is too long: ${length} characters (maximum: ${maxLength})`,
    undefined,
    undefined,
    [
      'Simplify your query by removing unnecessary filters',
      'Consider using fewer search terms',
    ]
  );
}

/**
 * Create error for too many filters
 */
export function createTooManyFiltersError(
  count: number,
  maxFilters: number = 50
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.TOO_MANY_FILTERS,
    `Too many filters: ${count} (maximum: ${maxFilters})`,
    undefined,
    undefined,
    [
      'Reduce the number of filters in your query',
      'Combine similar filters where possible',
    ]
  );
}

/**
 * Create error for nesting too deep
 */
export function createNestingTooDeepError(
  depth: number,
  maxDepth: number = 10
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.NESTING_TOO_DEEP,
    `Nesting too deep: ${depth} levels (maximum: ${maxDepth})`,
    undefined,
    undefined,
    [
      'Simplify your query by reducing parentheses nesting',
      'Break complex queries into multiple simpler queries',
    ]
  );
}

/**
 * Create error for invalid enum value
 */
export function createInvalidEnumValueError(
  filterName: string,
  value: string,
  validValues: string[],
  position?: Position
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.INVALID_ENUM_VALUE,
    `Invalid value "${value}" for filter "${filterName}"`,
    position,
    undefined,
    [
      `Valid values: ${validValues.join(', ')}`,
      `Example: ${filterName}:${validValues[0]}`,
    ]
  );
}

/**
 * Create error for too many OR clauses
 */
export function createTooManyOrClausesError(
  count: number,
  maxOr: number = 20
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.TOO_MANY_OR_CLAUSES,
    `Too many OR operators: ${count} (maximum: ${maxOr})`,
    undefined,
    undefined,
    [
      'Simplify your query by reducing OR conditions',
      'Consider breaking into multiple queries',
    ]
  );
}

/**
 * Create error for too many terms
 */
export function createTooManyTermsError(
  count: number,
  maxTerms: number = 100
): QueryParseError {
  return new QueryParseError(
    QueryErrorCode.TOO_MANY_TERMS,
    `Too many search terms: ${count} (maximum: ${maxTerms})`,
    undefined,
    undefined,
    [
      'Reduce the number of search terms',
      'Use more specific filters instead',
    ]
  );
}

/**
 * Find a similar filter name using simple string similarity
 */
function findSimilarFilterName(input: string): string | null {
  const validFilters = [
    'game', 'creator', 'broadcaster', 'tag', 'language',
    'duration', 'views', 'votes', 'after', 'before',
    'is', 'sort', 'karma', 'role', 'type'
  ];

  const inputLower = input.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const filter of validFilters) {
    const score = calculateSimilarity(inputLower, filter);
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = filter;
    }
  }

  return bestMatch;
}

/**
 * Calculate simple string similarity (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Check if one starts with the other
  if (a.startsWith(b) || b.startsWith(a)) return 0.8;

  // Simple character overlap
  const aChars = new Set(a);
  const bChars = new Set(b);
  const intersection = new Set([...aChars].filter(x => bChars.has(x)));
  const union = new Set([...aChars, ...bChars]);

  return intersection.size / union.size;
}

/**
 * Get example for a filter
 */
function getFilterExample(filterName: string): string {
  const examples: Record<string, string> = {
    game: 'game:valorant',
    creator: 'creator:shroud',
    broadcaster: 'broadcaster:pokimane',
    tag: 'tag:funny',
    language: 'language:en',
    duration: 'duration:30..60',
    views: 'views:>1000',
    votes: 'votes:>=10',
    after: 'after:2025-01-01',
    before: 'before:yesterday',
    is: 'is:featured',
    sort: 'sort:popular',
    karma: 'karma:>100',
    role: 'role:moderator',
    type: 'type:clips',
  };

  return examples[filterName] || `${filterName}:value`;
}
