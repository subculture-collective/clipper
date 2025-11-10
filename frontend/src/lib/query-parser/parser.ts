/**
 * Parser for the Clipper Query Language
 * Converts tokens into an Abstract Syntax Tree (AST)
 */

import {
  QueryNode,
  TermNode,
  FilterNode,
  FilterExprNode,
  GroupedFilterNode,
  FilterValue,
  RangeValue,
  DateValue,
  FlagValue,
  StringValue,
  FilterName,
  isValidFilterName,
  isValidComparisonOperator,
  isValidRelativeDate,
  ComparisonOperator,
  SORT_ORDERS,
  RESULT_TYPES,
  LANGUAGE_CODES,
  FLAGS,
  USER_ROLES,
} from './ast';
import { Token, TokenType, tokenize } from './lexer';
import {
  QueryParseError,
  QueryErrorCode,
  createInvalidFilterNameError,
  createMissingFilterValueError,
  createInvalidDateFormatError,
  createInvalidRangeError,
  createInvalidComparisonOperatorError,
  createQueryTooLongError,
  createTooManyFiltersError,
  createNestingTooDeepError,
  createInvalidEnumValueError,
  createTooManyOrClausesError,
  createTooManyTermsError,
} from './errors';

/**
 * Parser configuration
 */
export interface ParserConfig {
  maxQueryLength?: number;
  maxFilters?: number;
  maxNestingDepth?: number;
  maxOrClauses?: number;
  maxTerms?: number;
}

const DEFAULT_CONFIG: Required<ParserConfig> = {
  maxQueryLength: 1000,
  maxFilters: 50,
  maxNestingDepth: 10,
  maxOrClauses: 20,
  maxTerms: 100,
};

/**
 * Parser class
 */
export class Parser {
  private tokens: Token[];
  private current: number;
  private config: Required<ParserConfig>;
  private filterCount: number;
  private orCount: number;
  private termCount: number;

  constructor(tokens: Token[], config: ParserConfig = {}) {
    this.tokens = tokens;
    this.current = 0;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.filterCount = 0;
    this.orCount = 0;
    this.termCount = 0;
  }

  /**
   * Parse tokens into AST
   */
  parse(): QueryNode {
    const terms: TermNode[] = [];
    const filters: FilterExprNode[] = [];

    while (!this.isAtEnd()) {
      // Check if this looks like a filter (word followed by colon)
      if (this.isFilter()) {
        filters.push(this.parseFilterExpr());
      } else if (this.check(TokenType.LPAREN)) {
        // Could be a grouped filter - don't consume yet, let parseGroupedFilter do it
        filters.push(this.parseFilterExpr());
      } else if (!this.match(TokenType.EOF)) {
        // Otherwise it's a search term
        terms.push(this.parseTerm());
      }
    }

    return {
      type: 'Query',
      terms,
      filters,
    };
  }

  /**
   * Parse a term (free-text search)
   */
  private parseTerm(): TermNode {
    this.termCount++;
    if (this.termCount > this.config.maxTerms) {
      throw createTooManyTermsError(this.termCount, this.config.maxTerms);
    }

    const negated = this.match(TokenType.NEGATION);
    let value = '';

    if (this.match(TokenType.PHRASE)) {
      value = this.previous().value;
    } else if (this.match(TokenType.WORD)) {
      value = this.previous().value;
    } else {
      // Skip unexpected token
      this.advance();
      value = '';
    }

    return {
      type: 'Term',
      value,
      negated,
      loc: {
        start: this.previous().position,
        end: this.peek().position,
      },
    };
  }

  /**
   * Parse a filter expression (can be filter, grouped, or boolean)
   */
  private parseFilterExpr(nestingLevel: number = 0): FilterExprNode {
    if (nestingLevel > this.config.maxNestingDepth) {
      throw createNestingTooDeepError(nestingLevel, this.config.maxNestingDepth);
    }

    let left: FilterExprNode;

    if (this.check(TokenType.LPAREN)) {
      left = this.parseGroupedFilter(nestingLevel + 1);
    } else {
      left = this.parseFilter();
    }

    // Check for OR operator
    if (this.match(TokenType.OR)) {
      this.orCount++;
      if (this.orCount > this.config.maxOrClauses) {
        throw createTooManyOrClausesError(this.orCount, this.config.maxOrClauses);
      }

      const right = this.parseFilterExpr(nestingLevel);
      return {
        type: 'BooleanExpr',
        operator: 'OR',
        left,
        right,
      };
    }

    return left;
  }

  /**
   * Parse a single filter (e.g., game:valorant)
   */
  private parseFilter(): FilterNode {
    this.filterCount++;
    if (this.filterCount > this.config.maxFilters) {
      throw createTooManyFiltersError(this.filterCount, this.config.maxFilters);
    }

    const negated = this.match(TokenType.NEGATION);
    const startPos = this.peek().position;

    if (!this.match(TokenType.WORD)) {
      throw new QueryParseError(
        QueryErrorCode.INVALID_FILTER_NAME,
        'Expected filter name',
        this.peek().position
      );
    }

    const nameToken = this.previous();
    const name = nameToken.value.toLowerCase();

    // Validate filter name
    if (!isValidFilterName(name)) {
      throw createInvalidFilterNameError(name, nameToken.position);
    }

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      throw new QueryParseError(
        QueryErrorCode.INVALID_FILTER_NAME,
        `Expected ':' after filter name "${name}"`,
        this.peek().position
      );
    }

    // Parse filter value
    const value = this.parseFilterValue(name as FilterName);

    return {
      type: 'Filter',
      name: name as FilterName,
      value,
      negated,
      loc: {
        start: startPos,
        end: this.previous().position,
      },
    };
  }

  /**
   * Parse a grouped filter (e.g., (game:valorant OR game:csgo))
   */
  private parseGroupedFilter(nestingLevel: number = 0): GroupedFilterNode {
    const startPos = this.peek().position;
    this.consume(TokenType.LPAREN, 'Expected "("');

    const filters: FilterExprNode[] = [];

    while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      filters.push(this.parseFilterExpr(nestingLevel));
    }

    this.consume(TokenType.RPAREN, 'Expected ")"');

    return {
      type: 'GroupedFilter',
      filters,
      loc: {
        start: startPos,
        end: this.previous().position,
      },
    };
  }

  /**
   * Parse filter value based on filter type
   */
  private parseFilterValue(filterName: FilterName): FilterValue {
    // Range filters (duration, views, votes, karma)
    if (['duration', 'views', 'votes', 'karma'].includes(filterName)) {
      return this.parseRangeValue();
    }

    // Date filters (after, before)
    if (['after', 'before'].includes(filterName)) {
      return this.parseDateValue();
    }

    // Flag filters (is)
    if (filterName === 'is') {
      return this.parseFlagValue();
    }

    // Enum filters (sort, type, language, role)
    if (['sort', 'type', 'language', 'role'].includes(filterName)) {
      return this.parseEnumValue(filterName);
    }

    // String filters (game, creator, broadcaster, tag)
    return this.parseStringValue();
  }

  /**
   * Parse range value (e.g., >10, 10..100)
   */
  private parseRangeValue(): RangeValue {
    const startPos = this.peek().position;

    // Check for comparison operator
    if (this.match(TokenType.COMPARISON)) {
      const op = this.previous().value;
      
      if (!isValidComparisonOperator(op)) {
        throw createInvalidComparisonOperatorError(op, this.previous().position);
      }

      if (!this.match(TokenType.NUMBER)) {
        throw new QueryParseError(
          QueryErrorCode.MISSING_FILTER_VALUE,
          'Expected number after comparison operator',
          this.peek().position
        );
      }

      const num = parseInt(this.previous().value, 10);

      return {
        type: 'RangeValue',
        operator: op as ComparisonOperator,
        min: op === '>' || op === '>=' ? num : undefined,
        max: op === '<' || op === '<=' ? num : undefined,
        loc: { start: startPos, end: this.previous().position },
      };
    }

    // Check for range (min..max)
    if (this.match(TokenType.NUMBER)) {
      const min = parseInt(this.previous().value, 10);

      if (this.match(TokenType.RANGE)) {
        if (!this.match(TokenType.NUMBER)) {
          throw new QueryParseError(
            QueryErrorCode.MISSING_FILTER_VALUE,
            'Expected number after ".."',
            this.peek().position
          );
        }

        const max = parseInt(this.previous().value, 10);

        if (min > max) {
          throw createInvalidRangeError(min, max, startPos);
        }

        return {
          type: 'RangeValue',
          min,
          max,
          loc: { start: startPos, end: this.previous().position },
        };
      }

      // Just a number, treat as exact match
      return {
        type: 'RangeValue',
        operator: '=',
        min: min,
        max: min,
        loc: { start: startPos, end: this.previous().position },
      };
    }

    throw createMissingFilterValueError('range', this.peek().position);
  }

  /**
   * Parse date value (ISO date or relative)
   */
  private parseDateValue(): DateValue {
    const startPos = this.peek().position;

    // Try to parse WORD token (for relative dates and potentially full ISO dates)
    if (this.match(TokenType.WORD)) {
      const value = this.previous().value.toLowerCase();

      // Check if it's a relative date
      if (isValidRelativeDate(value)) {
        return {
          type: 'DateValue',
          date: value,
          isRelative: true,
          loc: { start: startPos, end: this.previous().position },
        };
      }

      // Check if it's an ISO date (YYYY-MM-DD)
      if (this.isValidISODate(value)) {
        return {
          type: 'DateValue',
          date: value,
          isRelative: false,
          loc: { start: startPos, end: this.previous().position },
        };
      }

      throw createInvalidDateFormatError(value, this.previous().position);
    }

    // Try to parse ISO date as NUMBER-WORD sequence (e.g., 2025-01-01)
    if (this.match(TokenType.NUMBER)) {
      const year = this.previous().value;
      
      // Check if next token looks like rest of date
      if (this.match(TokenType.WORD)) {
        const rest = this.previous().value;
        const fullDate = year + rest;
        
        if (this.isValidISODate(fullDate)) {
          return {
            type: 'DateValue',
            date: fullDate,
            isRelative: false,
            loc: { start: startPos, end: this.previous().position },
          };
        }
        
        throw createInvalidDateFormatError(fullDate, this.previous().position);
      }
      
      // Just a number without rest of date
      throw createInvalidDateFormatError(year, this.previous().position);
    }

    throw createMissingFilterValueError('date', this.peek().position);
  }

  /**
   * Parse flag value (featured, nsfw)
   */
  private parseFlagValue(): FlagValue {
    const startPos = this.peek().position;

    if (this.match(TokenType.WORD)) {
      const value = this.previous().value.toLowerCase();

      if (FLAGS.includes(value as 'featured' | 'nsfw')) {
        return {
          type: 'FlagValue',
          flag: value as 'featured' | 'nsfw',
          loc: { start: startPos, end: this.previous().position },
        };
      }

      throw createInvalidEnumValueError(
        'is',
        value,
        [...FLAGS],
        this.previous().position
      );
    }

    throw createMissingFilterValueError('is', this.peek().position);
  }

  /**
   * Parse enum value (sort, type, language, role)
   */
  private parseEnumValue(filterName: FilterName): StringValue {
    const startPos = this.peek().position;

    if (this.match(TokenType.WORD, TokenType.PHRASE)) {
      const value = this.previous().value.toLowerCase();
      const validValues = this.getValidEnumValues(filterName);

      if (!validValues.includes(value)) {
        throw createInvalidEnumValueError(
          filterName,
          value,
          validValues,
          this.previous().position
        );
      }

      return {
        type: 'StringValue',
        value,
        quoted: this.previous().type === TokenType.PHRASE,
        loc: { start: startPos, end: this.previous().position },
      };
    }

    throw createMissingFilterValueError(filterName, this.peek().position);
  }

  /**
   * Parse string value
   */
  private parseStringValue(): StringValue {
    const startPos = this.peek().position;

    if (this.match(TokenType.WORD, TokenType.PHRASE)) {
      const token = this.previous();
      return {
        type: 'StringValue',
        value: token.value,
        quoted: token.type === TokenType.PHRASE,
        loc: { start: startPos, end: this.previous().position },
      };
    }

    throw new QueryParseError(
      QueryErrorCode.MISSING_FILTER_VALUE,
      'Expected string value',
      this.peek().position
    );
  }

  /**
   * Get valid enum values for a filter
   */
  private getValidEnumValues(filterName: FilterName): string[] {
    switch (filterName) {
      case 'sort':
        return [...SORT_ORDERS];
      case 'type':
        return [...RESULT_TYPES];
      case 'language':
        return [...LANGUAGE_CODES];
      case 'role':
        return [...USER_ROLES];
      default:
        return [];
    }
  }

  /**
   * Check if string is a valid ISO date (YYYY-MM-DD)
   */
  private isValidISODate(str: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(str)) return false;

    const date = new Date(str);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Check if current position looks like a filter
   */
  private isFilter(): boolean {
    if (this.check(TokenType.NEGATION)) {
      return this.checkAt(1, TokenType.WORD) && this.checkAt(2, TokenType.COLON);
    }
    return this.check(TokenType.WORD) && this.checkAt(1, TokenType.COLON);
  }

  /**
   * Match current token against types
   */
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  /**
   * Check if current token matches type
   */
  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  /**
   * Check token at offset
   */
  private checkAt(offset: number, type: TokenType): boolean {
    const index = this.current + offset;
    if (index >= this.tokens.length) return false;
    return this.tokens[index].type === type;
  }

  /**
   * Consume token or throw error
   */
  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new QueryParseError(QueryErrorCode.INVALID_FILTER_NAME, message, this.peek().position);
  }

  /**
   * Advance to next token
   */
  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  /**
   * Check if at end of tokens
   */
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  /**
   * Get current token
   */
  private peek(): Token {
    return this.tokens[this.current];
  }

  /**
   * Get previous token
   */
  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}

/**
 * Convenience function to parse a query string
 */
export function parseQuery(query: string, config?: ParserConfig): QueryNode {
  // Check query length
  const maxLength = config?.maxQueryLength ?? DEFAULT_CONFIG.maxQueryLength;
  if (query.length > maxLength) {
    throw createQueryTooLongError(query.length, maxLength);
  }

  const tokens = tokenize(query);
  const parser = new Parser(tokens, config);
  return parser.parse();
}
