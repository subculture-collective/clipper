/**
 * Tests for Error Handling
 */

import { describe, it, expect } from 'vitest';
import {
  QueryParseError,
  QueryErrorCode,
  createInvalidFilterNameError,
  createMissingFilterValueError,
  createInvalidDateFormatError,
  createInvalidRangeError,
  createUnclosedQuoteError,
  createInvalidComparisonOperatorError,
  createQueryTooLongError,
  createTooManyFiltersError,
  createNestingTooDeepError,
  createInvalidEnumValueError,
} from '../errors';

describe('QueryParseError', () => {
  it('should create error with code and message', () => {
    const error = new QueryParseError(
      QueryErrorCode.INVALID_FILTER_NAME,
      'Test error'
    );
    expect(error.code).toBe(QueryErrorCode.INVALID_FILTER_NAME);
    expect(error.message).toBe('Test error');
  });

  it('should include position in error', () => {
    const position = { line: 1, column: 5, offset: 4 };
    const error = new QueryParseError(
      QueryErrorCode.INVALID_FILTER_NAME,
      'Test error',
      position
    );
    expect(error.position).toEqual(position);
  });

  it('should include suggestions', () => {
    const error = new QueryParseError(
      QueryErrorCode.INVALID_FILTER_NAME,
      'Test error',
      undefined,
      undefined,
      ['Try this', 'Or that']
    );
    expect(error.suggestions).toEqual(['Try this', 'Or that']);
  });

  it('should format error message', () => {
    const error = new QueryParseError(
      QueryErrorCode.INVALID_FILTER_NAME,
      'Test error',
      { line: 1, column: 5, offset: 4 },
      undefined,
      ['Suggestion 1']
    );
    const formatted = error.format();
    expect(formatted).toContain('QE001');
    expect(formatted).toContain('Test error');
    expect(formatted).toContain('line 1, column 5');
    expect(formatted).toContain('Suggestion 1');
  });

  it('should convert to JSON', () => {
    const error = new QueryParseError(
      QueryErrorCode.INVALID_FILTER_NAME,
      'Test error'
    );
    const json = error.toJSON();
    expect(json.code).toBe(QueryErrorCode.INVALID_FILTER_NAME);
    expect(json.message).toBe('Test error');
  });
});

describe('Error Factory Functions', () => {
  describe('createInvalidFilterNameError', () => {
    it('should create error with unknown filter name', () => {
      const error = createInvalidFilterNameError('unknownfilter');
      expect(error.code).toBe(QueryErrorCode.INVALID_FILTER_NAME);
      expect(error.message).toContain('unknownfilter');
      expect(error.suggestions.length).toBeGreaterThan(0);
    });

    it('should suggest similar filter names', () => {
      const error = createInvalidFilterNameError('gme');
      expect(error.suggestions.some(s => s.includes('game'))).toBe(true);
    });

    it('should suggest quoting for search terms', () => {
      const error = createInvalidFilterNameError('hello');
      expect(error.suggestions.some(s => s.includes('quotes'))).toBe(true);
    });
  });

  describe('createMissingFilterValueError', () => {
    it('should create error for missing value', () => {
      const error = createMissingFilterValueError('game');
      expect(error.code).toBe(QueryErrorCode.MISSING_FILTER_VALUE);
      expect(error.message).toContain('game');
      expect(error.suggestions.some(s => s.includes('game:'))).toBe(true);
    });

    it('should include usage example', () => {
      const error = createMissingFilterValueError('votes');
      expect(error.suggestions.some(s => s.includes('votes:'))).toBe(true);
    });
  });

  describe('createInvalidDateFormatError', () => {
    it('should create error for invalid date', () => {
      const error = createInvalidDateFormatError('2025/01/01');
      expect(error.code).toBe(QueryErrorCode.INVALID_DATE_FORMAT);
      expect(error.message).toContain('2025/01/01');
    });

    it('should suggest ISO format', () => {
      const error = createInvalidDateFormatError('invalid');
      expect(error.suggestions.some(s => s.includes('YYYY-MM-DD'))).toBe(true);
    });

    it('should suggest relative dates', () => {
      const error = createInvalidDateFormatError('invalid');
      expect(error.suggestions.some(s => s.includes('yesterday'))).toBe(true);
    });
  });

  describe('createInvalidRangeError', () => {
    it('should create error for invalid range', () => {
      const error = createInvalidRangeError(100, 50);
      expect(error.code).toBe(QueryErrorCode.INVALID_RANGE);
      expect(error.message).toContain('100');
      expect(error.message).toContain('50');
    });

    it('should suggest correct range format', () => {
      const error = createInvalidRangeError(100, 50);
      expect(error.suggestions.some(s => s.includes('min..max'))).toBe(true);
    });
  });

  describe('createUnclosedQuoteError', () => {
    it('should create error for unclosed quote', () => {
      const error = createUnclosedQuoteError();
      expect(error.code).toBe(QueryErrorCode.UNCLOSED_QUOTE);
    });

    it('should suggest closing quotes', () => {
      const error = createUnclosedQuoteError();
      expect(error.suggestions.some(s => s.includes('closed'))).toBe(true);
    });

    it('should suggest escaping quotes', () => {
      const error = createUnclosedQuoteError();
      expect(error.suggestions.some(s => s.includes('backslash'))).toBe(true);
    });
  });

  describe('createInvalidComparisonOperatorError', () => {
    it('should create error for invalid operator', () => {
      const error = createInvalidComparisonOperatorError('><');
      expect(error.code).toBe(QueryErrorCode.INVALID_COMPARISON_OPERATOR);
      expect(error.message).toContain('><');
    });

    it('should list valid operators', () => {
      const error = createInvalidComparisonOperatorError('invalid');
      expect(error.suggestions.some(s => s.includes('>'))).toBe(true);
      expect(error.suggestions.some(s => s.includes('<'))).toBe(true);
    });
  });

  describe('createQueryTooLongError', () => {
    it('should create error for query too long', () => {
      const error = createQueryTooLongError(1500, 1000);
      expect(error.code).toBe(QueryErrorCode.QUERY_TOO_LONG);
      expect(error.message).toContain('1500');
      expect(error.message).toContain('1000');
    });

    it('should suggest simplification', () => {
      const error = createQueryTooLongError(1500);
      expect(error.suggestions.some(s => s.includes('Simplify'))).toBe(true);
    });
  });

  describe('createTooManyFiltersError', () => {
    it('should create error for too many filters', () => {
      const error = createTooManyFiltersError(60, 50);
      expect(error.code).toBe(QueryErrorCode.TOO_MANY_FILTERS);
      expect(error.message).toContain('60');
      expect(error.message).toContain('50');
    });

    it('should suggest reduction', () => {
      const error = createTooManyFiltersError(60);
      expect(error.suggestions.some(s => s.includes('Reduce'))).toBe(true);
    });
  });

  describe('createNestingTooDeepError', () => {
    it('should create error for nesting too deep', () => {
      const error = createNestingTooDeepError(15, 10);
      expect(error.code).toBe(QueryErrorCode.NESTING_TOO_DEEP);
      expect(error.message).toContain('15');
      expect(error.message).toContain('10');
    });

    it('should suggest simplification', () => {
      const error = createNestingTooDeepError(15);
      expect(error.suggestions.some(s => s.includes('Simplify'))).toBe(true);
    });
  });

  describe('createInvalidEnumValueError', () => {
    it('should create error for invalid enum value', () => {
      const error = createInvalidEnumValueError(
        'sort',
        'invalid',
        ['relevance', 'recent', 'popular']
      );
      expect(error.code).toBe(QueryErrorCode.INVALID_ENUM_VALUE);
      expect(error.message).toContain('invalid');
      expect(error.message).toContain('sort');
    });

    it('should list valid values', () => {
      const error = createInvalidEnumValueError(
        'sort',
        'invalid',
        ['relevance', 'recent', 'popular']
      );
      expect(error.suggestions.some(s => s.includes('relevance'))).toBe(true);
      expect(error.suggestions.some(s => s.includes('recent'))).toBe(true);
    });

    it('should provide example', () => {
      const error = createInvalidEnumValueError(
        'sort',
        'invalid',
        ['relevance', 'recent', 'popular']
      );
      expect(error.suggestions.some(s => s.includes('sort:'))).toBe(true);
    });
  });
});

describe('Error Message Quality', () => {
  it('should provide helpful messages for common mistakes', () => {
    const errors = [
      createInvalidFilterNameError('gam'),
      createMissingFilterValueError('game'),
      createInvalidDateFormatError('2025/01/01'),
      createInvalidRangeError(100, 50),
    ];

    errors.forEach(error => {
      expect(error.suggestions.length).toBeGreaterThan(0);
      expect(error.message.length).toBeGreaterThan(0);
    });
  });

  it('should format errors consistently', () => {
    const error = createInvalidFilterNameError('test');
    const formatted = error.format();
    
    expect(formatted).toContain('QE001:');
    expect(formatted).toContain('Suggestions:');
  });

  it('should provide actionable suggestions', () => {
    const error = createInvalidFilterNameError('unknownfilter');
    
    // Suggestions should be actionable and specific
    expect(error.suggestions.some(s => 
      s.includes('Valid filters:') || s.includes('Did you mean')
    )).toBe(true);
  });
});
