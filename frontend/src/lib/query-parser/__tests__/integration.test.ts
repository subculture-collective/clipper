/**
 * Integration tests for the complete query parser
 */

import { describe, it, expect } from 'vitest';
import { parseQuery } from '../parser';
import { QueryParseError } from '../errors';

describe('Query Parser Integration', () => {
  describe('Grammar Coverage - 100%', () => {
    describe('Terms', () => {
      it('should parse single word term', () => {
        const ast = parseQuery('valorant');
        expect(ast.terms).toHaveLength(1);
        expect(ast.terms[0].value).toBe('valorant');
        expect(ast.terms[0].negated).toBe(false);
      });

      it('should parse phrase term', () => {
        const ast = parseQuery('"epic moment"');
        expect(ast.terms).toHaveLength(1);
        expect(ast.terms[0].value).toBe('epic moment');
      });

      it('should parse negated term', () => {
        const ast = parseQuery('-fortnite');
        expect(ast.terms[0].negated).toBe(true);
      });

      it('should parse multiple terms', () => {
        const ast = parseQuery('epic clutch moment');
        expect(ast.terms).toHaveLength(3);
      });
    });

    describe('All Filter Types', () => {
      it('should parse game filter', () => {
        const ast = parseQuery('game:valorant');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse creator filter', () => {
        const ast = parseQuery('creator:shroud');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse broadcaster filter', () => {
        const ast = parseQuery('broadcaster:pokimane');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse tag filter', () => {
        const ast = parseQuery('tag:funny');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse language filter', () => {
        const ast = parseQuery('language:en');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse duration filter', () => {
        const ast = parseQuery('duration:30..60');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse views filter', () => {
        const ast = parseQuery('views:>1000');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse votes filter', () => {
        const ast = parseQuery('votes:>=10');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse after filter', () => {
        const ast = parseQuery('after:2025-01-01');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse before filter', () => {
        const ast = parseQuery('before:yesterday');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse is filter', () => {
        const ast = parseQuery('is:featured');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse sort filter', () => {
        const ast = parseQuery('sort:popular');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse karma filter', () => {
        const ast = parseQuery('karma:>100');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse role filter', () => {
        const ast = parseQuery('role:moderator');
        expect(ast.filters[0].type).toBe('Filter');
      });

      it('should parse type filter', () => {
        const ast = parseQuery('type:clips');
        expect(ast.filters[0].type).toBe('Filter');
      });
    });

    describe('All Comparison Operators', () => {
      it('should parse > operator', () => {
        const ast = parseQuery('votes:>50');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
          expect(filter.value.operator).toBe('>');
        }
      });

      it('should parse >= operator', () => {
        const ast = parseQuery('votes:>=50');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
          expect(filter.value.operator).toBe('>=');
        }
      });

      it('should parse < operator', () => {
        const ast = parseQuery('votes:<100');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
          expect(filter.value.operator).toBe('<');
        }
      });

      it('should parse <= operator', () => {
        const ast = parseQuery('votes:<=100');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
          expect(filter.value.operator).toBe('<=');
        }
      });

      it('should parse = operator', () => {
        const ast = parseQuery('votes:50');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
          expect(filter.value.operator).toBe('=');
        }
      });

      it('should parse range operator', () => {
        const ast = parseQuery('votes:10..100');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
          expect(filter.value.min).toBe(10);
          expect(filter.value.max).toBe(100);
        }
      });
    });

    describe('All Date Formats', () => {
      it('should parse ISO date', () => {
        const ast = parseQuery('after:2025-01-15');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
          expect(filter.value.isRelative).toBe(false);
        }
      });

      it('should parse today', () => {
        const ast = parseQuery('after:today');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
          expect(filter.value.date).toBe('today');
          expect(filter.value.isRelative).toBe(true);
        }
      });

      it('should parse yesterday', () => {
        const ast = parseQuery('after:yesterday');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
          expect(filter.value.date).toBe('yesterday');
        }
      });

      it('should parse last-week', () => {
        const ast = parseQuery('after:last-week');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
          expect(filter.value.date).toBe('last-week');
        }
      });

      it('should parse last-month', () => {
        const ast = parseQuery('after:last-month');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
          expect(filter.value.date).toBe('last-month');
        }
      });

      it('should parse last-year', () => {
        const ast = parseQuery('after:last-year');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
          expect(filter.value.date).toBe('last-year');
        }
      });
    });

    describe('All Boolean Flags', () => {
      it('should parse is:featured', () => {
        const ast = parseQuery('is:featured');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'FlagValue') {
          expect(filter.value.flag).toBe('featured');
        }
      });

      it('should parse is:nsfw', () => {
        const ast = parseQuery('is:nsfw');
        const filter = ast.filters[0];
        if (filter.type === 'Filter' && filter.value.type === 'FlagValue') {
          expect(filter.value.flag).toBe('nsfw');
        }
      });
    });

    describe('All Sort Orders', () => {
      it('should parse sort:relevance', () => {
        const ast = parseQuery('sort:relevance');
        expect(ast.filters).toHaveLength(1);
      });

      it('should parse sort:recent', () => {
        const ast = parseQuery('sort:recent');
        expect(ast.filters).toHaveLength(1);
      });

      it('should parse sort:popular', () => {
        const ast = parseQuery('sort:popular');
        expect(ast.filters).toHaveLength(1);
      });
    });

    describe('All Result Types', () => {
      it('should parse type:clips', () => {
        const ast = parseQuery('type:clips');
        expect(ast.filters).toHaveLength(1);
      });

      it('should parse type:creators', () => {
        const ast = parseQuery('type:creators');
        expect(ast.filters).toHaveLength(1);
      });

      it('should parse type:games', () => {
        const ast = parseQuery('type:games');
        expect(ast.filters).toHaveLength(1);
      });

      it('should parse type:tags', () => {
        const ast = parseQuery('type:tags');
        expect(ast.filters).toHaveLength(1);
      });

      it('should parse type:all', () => {
        const ast = parseQuery('type:all');
        expect(ast.filters).toHaveLength(1);
      });
    });

    describe('Boolean Expressions', () => {
      it('should parse OR expression', () => {
        const ast = parseQuery('game:valorant OR game:csgo');
        expect(ast.filters[0].type).toBe('BooleanExpr');
      });

      it('should parse multiple OR expressions', () => {
        const ast = parseQuery('game:valorant OR game:csgo OR game:apex');
        expect(ast.filters[0].type).toBe('BooleanExpr');
      });
    });

    describe('Grouped Filters', () => {
      it('should parse simple group', () => {
        const ast = parseQuery('(game:valorant)');
        expect(ast.filters[0].type).toBe('GroupedFilter');
      });

      it('should parse group with OR', () => {
        const ast = parseQuery('(game:valorant OR game:csgo)');
        expect(ast.filters[0].type).toBe('GroupedFilter');
      });

      it('should parse nested groups', () => {
        const ast = parseQuery('((game:valorant))');
        expect(ast.filters[0].type).toBe('GroupedFilter');
      });
    });

    describe('Negation', () => {
      it('should parse negated term', () => {
        const ast = parseQuery('-fortnite');
        expect(ast.terms[0].negated).toBe(true);
      });

      it('should parse negated filter', () => {
        const ast = parseQuery('-game:fortnite');
        const filter = ast.filters[0];
        if (filter.type === 'Filter') {
          expect(filter.negated).toBe(true);
        }
      });
    });
  });

  describe('Performance Tests', () => {
    it('should parse simple query in <5ms', () => {
      const start = performance.now();
      parseQuery('game:valorant tag:clutch');
      const end = performance.now();
      expect(end - start).toBeLessThan(5);
    });

    it('should parse complex query in <5ms', () => {
      const start = performance.now();
      parseQuery('(game:valorant OR game:csgo) tag:clutch -is:nsfw votes:>=10 after:last-week sort:popular');
      const end = performance.now();
      expect(end - start).toBeLessThan(5);
    });

    it('should parse query with many filters efficiently', () => {
      const filters = Array(20).fill('tag:test').join(' ');
      const start = performance.now();
      parseQuery(filters);
      const end = performance.now();
      expect(end - start).toBeLessThan(10);
    });
  });

  describe('All RFC Examples', () => {
    it('should parse: game:valorant tag:clutch after:last-week votes:>=50 is:featured', () => {
      const ast = parseQuery('game:valorant tag:clutch after:last-week votes:>=50 is:featured');
      expect(ast.filters).toHaveLength(5);
    });

    it('should parse: game:minecraft tag:funny -is:nsfw', () => {
      const ast = parseQuery('game:minecraft tag:funny -is:nsfw');
      expect(ast.filters).toHaveLength(3);
    });

    it('should parse: (game:valorant OR game:csgo) votes:>100 sort:recent', () => {
      const ast = parseQuery('(game:valorant OR game:csgo) votes:>100 sort:recent');
      expect(ast.filters).toHaveLength(3);
    });

    it('should parse: creator:shroud duration:<60 votes:>20 sort:popular', () => {
      const ast = parseQuery('creator:shroud duration:<60 votes:>20 sort:popular');
      expect(ast.filters).toHaveLength(4);
    });

    it('should parse: epic (game:"League of Legends" OR game:"Dota 2")', () => {
      const ast = parseQuery('epic (game:"League of Legends" OR game:"Dota 2")');
      expect(ast.terms).toHaveLength(1);
      expect(ast.filters).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query', () => {
      const ast = parseQuery('');
      expect(ast.terms).toHaveLength(0);
      expect(ast.filters).toHaveLength(0);
    });

    it('should handle whitespace-only query', () => {
      const ast = parseQuery('   ');
      expect(ast.terms).toHaveLength(0);
      expect(ast.filters).toHaveLength(0);
    });

    it('should handle mixed quotes', () => {
      const ast = parseQuery('game:"League of Legends" epic');
      expect(ast.terms).toHaveLength(1);
      expect(ast.filters).toHaveLength(1);
    });

    it('should handle escaped quotes in phrases', () => {
      const ast = parseQuery('"test \\"quoted\\" text"');
      expect(ast.terms[0].value).toBe('test "quoted" text');
    });

    it('should handle hyphens in words', () => {
      const ast = parseQuery('counter-strike');
      expect(ast.terms[0].value).toBe('counter-strike');
    });

    it('should handle case-insensitive keywords', () => {
      const ast = parseQuery('game:valorant or game:csgo');
      expect(ast.filters[0].type).toBe('BooleanExpr');
    });
  });

  describe('Error Recovery', () => {
    it('should provide helpful error for unknown filter', () => {
      try {
        parseQuery('unknownfilter:value');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(QueryParseError);
        if (error instanceof QueryParseError) {
          expect(error.suggestions.length).toBeGreaterThan(0);
        }
      }
    });

    it('should provide helpful error for missing value', () => {
      try {
        parseQuery('game:');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(QueryParseError);
        if (error instanceof QueryParseError) {
          // Should be a missing value error (QE002)
          expect(error.code).toBe('QE002');
          expect(error.message.length).toBeGreaterThan(0);
        }
      }
    });

    it('should provide helpful error for invalid date', () => {
      try {
        parseQuery('after:invalid-date');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(QueryParseError);
        if (error instanceof QueryParseError) {
          expect(error.suggestions.some(s => s.includes('YYYY-MM-DD'))).toBe(true);
        }
      }
    });
  });
});
