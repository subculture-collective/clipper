/**
 * Tests for the Parser
 */

import { describe, it, expect } from 'vitest';
import { parseQuery } from '../parser';
import { QueryParseError } from '../errors';

describe('Parser', () => {
  describe('Basic Parsing', () => {
    it('should parse empty query', () => {
      const ast = parseQuery('');
      expect(ast.type).toBe('Query');
      expect(ast.terms).toHaveLength(0);
      expect(ast.filters).toHaveLength(0);
    });

    it('should parse simple search term', () => {
      const ast = parseQuery('hello');
      expect(ast.terms).toHaveLength(1);
      expect(ast.terms[0].value).toBe('hello');
      expect(ast.terms[0].negated).toBe(false);
    });

    it('should parse multiple search terms', () => {
      const ast = parseQuery('hello world');
      expect(ast.terms).toHaveLength(2);
      expect(ast.terms[0].value).toBe('hello');
      expect(ast.terms[1].value).toBe('world');
    });

    it('should parse negated term', () => {
      const ast = parseQuery('-hello');
      expect(ast.terms).toHaveLength(1);
      expect(ast.terms[0].value).toBe('hello');
      expect(ast.terms[0].negated).toBe(true);
    });

    it('should parse quoted phrase', () => {
      const ast = parseQuery('"hello world"');
      expect(ast.terms).toHaveLength(1);
      expect(ast.terms[0].value).toBe('hello world');
    });
  });

  describe('Filter Parsing', () => {
    it('should parse simple filter', () => {
      const ast = parseQuery('game:valorant');
      expect(ast.filters).toHaveLength(1);
      const filter = ast.filters[0];
      expect(filter.type).toBe('Filter');
      if (filter.type === 'Filter') {
        expect(filter.name).toBe('game');
        expect(filter.value.type).toBe('StringValue');
        if (filter.value.type === 'StringValue') {
          expect(filter.value.value).toBe('valorant');
        }
      }
    });

    it('should parse filter with quoted value', () => {
      const ast = parseQuery('game:"League of Legends"');
      expect(ast.filters).toHaveLength(1);
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'StringValue') {
        expect(filter.value.value).toBe('League of Legends');
        expect(filter.value.quoted).toBe(true);
      }
    });

    it('should parse negated filter', () => {
      const ast = parseQuery('-game:fortnite');
      expect(ast.filters).toHaveLength(1);
      const filter = ast.filters[0];
      if (filter.type === 'Filter') {
        expect(filter.negated).toBe(true);
        expect(filter.name).toBe('game');
      }
    });

    it('should parse multiple filters', () => {
      const ast = parseQuery('game:valorant tag:funny');
      expect(ast.filters).toHaveLength(2);
    });

    it('should parse case-insensitive filter names', () => {
      const ast = parseQuery('GAME:valorant');
      expect(ast.filters).toHaveLength(1);
      const filter = ast.filters[0];
      if (filter.type === 'Filter') {
        expect(filter.name).toBe('game');
      }
    });
  });

  describe('Range Filter Parsing', () => {
    it('should parse greater than comparison', () => {
      const ast = parseQuery('votes:>50');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
        expect(filter.value.operator).toBe('>');
        expect(filter.value.min).toBe(50);
      }
    });

    it('should parse greater than or equal comparison', () => {
      const ast = parseQuery('votes:>=50');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
        expect(filter.value.operator).toBe('>=');
        expect(filter.value.min).toBe(50);
      }
    });

    it('should parse less than comparison', () => {
      const ast = parseQuery('duration:<60');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
        expect(filter.value.operator).toBe('<');
        expect(filter.value.max).toBe(60);
      }
    });

    it('should parse less than or equal comparison', () => {
      const ast = parseQuery('duration:<=60');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
        expect(filter.value.operator).toBe('<=');
        expect(filter.value.max).toBe(60);
      }
    });

    it('should parse range with min and max', () => {
      const ast = parseQuery('votes:10..100');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
        expect(filter.value.min).toBe(10);
        expect(filter.value.max).toBe(100);
        expect(filter.value.operator).toBeUndefined();
      }
    });

    it('should parse exact number as range', () => {
      const ast = parseQuery('votes:50');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'RangeValue') {
        expect(filter.value.operator).toBe('=');
        expect(filter.value.min).toBe(50);
        expect(filter.value.max).toBe(50);
      }
    });
  });

  describe('Date Filter Parsing', () => {
    it('should parse ISO date', () => {
      const ast = parseQuery('after:2025-01-01');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
        expect(filter.value.date).toBe('2025-01-01');
        expect(filter.value.isRelative).toBe(false);
      }
    });

    it('should parse relative date - today', () => {
      const ast = parseQuery('after:today');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
        expect(filter.value.date).toBe('today');
        expect(filter.value.isRelative).toBe(true);
      }
    });

    it('should parse relative date - yesterday', () => {
      const ast = parseQuery('after:yesterday');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
        expect(filter.value.date).toBe('yesterday');
        expect(filter.value.isRelative).toBe(true);
      }
    });

    it('should parse relative date - last-week', () => {
      const ast = parseQuery('after:last-week');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
        expect(filter.value.date).toBe('last-week');
        expect(filter.value.isRelative).toBe(true);
      }
    });

    it('should parse before filter', () => {
      const ast = parseQuery('before:2025-12-31');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'DateValue') {
        expect(filter.value.date).toBe('2025-12-31');
        expect(filter.value.isRelative).toBe(false);
      }
    });

    it('should reject invalid date format', () => {
      expect(() => parseQuery('after:2025/01/01')).toThrow(QueryParseError);
    });

    it('should reject invalid relative date', () => {
      expect(() => parseQuery('after:invalid-date')).toThrow(QueryParseError);
    });
  });

  describe('Flag Filter Parsing', () => {
    it('should parse is:featured flag', () => {
      const ast = parseQuery('is:featured');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'FlagValue') {
        expect(filter.value.flag).toBe('featured');
      }
    });

    it('should parse is:nsfw flag', () => {
      const ast = parseQuery('is:nsfw');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'FlagValue') {
        expect(filter.value.flag).toBe('nsfw');
      }
    });

    it('should parse negated flag', () => {
      const ast = parseQuery('-is:nsfw');
      const filter = ast.filters[0];
      if (filter.type === 'Filter') {
        expect(filter.negated).toBe(true);
        if (filter.value.type === 'FlagValue') {
          expect(filter.value.flag).toBe('nsfw');
        }
      }
    });

    it('should reject invalid flag value', () => {
      expect(() => parseQuery('is:invalid')).toThrow(QueryParseError);
    });
  });

  describe('Enum Filter Parsing', () => {
    it('should parse sort:relevance', () => {
      const ast = parseQuery('sort:relevance');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'StringValue') {
        expect(filter.value.value).toBe('relevance');
      }
    });

    it('should parse sort:recent', () => {
      const ast = parseQuery('sort:recent');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'StringValue') {
        expect(filter.value.value).toBe('recent');
      }
    });

    it('should parse sort:popular', () => {
      const ast = parseQuery('sort:popular');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'StringValue') {
        expect(filter.value.value).toBe('popular');
      }
    });

    it('should parse type:clips', () => {
      const ast = parseQuery('type:clips');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'StringValue') {
        expect(filter.value.value).toBe('clips');
      }
    });

    it('should parse language:en', () => {
      const ast = parseQuery('language:en');
      const filter = ast.filters[0];
      if (filter.type === 'Filter' && filter.value.type === 'StringValue') {
        expect(filter.value.value).toBe('en');
      }
    });

    it('should reject invalid sort value', () => {
      expect(() => parseQuery('sort:invalid')).toThrow(QueryParseError);
    });

    it('should reject invalid type value', () => {
      expect(() => parseQuery('type:invalid')).toThrow(QueryParseError);
    });
  });

  describe('Boolean Expressions', () => {
    it('should parse OR expression', () => {
      const ast = parseQuery('game:valorant OR game:csgo');
      expect(ast.filters).toHaveLength(1);
      const expr = ast.filters[0];
      expect(expr.type).toBe('BooleanExpr');
      if (expr.type === 'BooleanExpr') {
        expect(expr.operator).toBe('OR');
        expect(expr.left.type).toBe('Filter');
        expect(expr.right.type).toBe('Filter');
      }
    });

    it('should parse case-insensitive OR', () => {
      const ast = parseQuery('game:valorant or game:csgo');
      const expr = ast.filters[0];
      expect(expr.type).toBe('BooleanExpr');
    });

    it('should parse multiple OR expressions', () => {
      const ast = parseQuery('game:valorant OR game:csgo OR game:apex');
      expect(ast.filters).toHaveLength(1);
      const expr = ast.filters[0];
      expect(expr.type).toBe('BooleanExpr');
      if (expr.type === 'BooleanExpr') {
        expect(expr.right.type).toBe('BooleanExpr');
      }
    });
  });

  describe('Grouped Filters', () => {
    it('should parse grouped filters', () => {
      const ast = parseQuery('(game:valorant)');
      expect(ast.filters).toHaveLength(1);
      const grouped = ast.filters[0];
      expect(grouped.type).toBe('GroupedFilter');
      if (grouped.type === 'GroupedFilter') {
        expect(grouped.filters).toHaveLength(1);
      }
    });

    it('should parse grouped OR expression', () => {
      const ast = parseQuery('(game:valorant OR game:csgo)');
      const grouped = ast.filters[0];
      expect(grouped.type).toBe('GroupedFilter');
      if (grouped.type === 'GroupedFilter') {
        expect(grouped.filters).toHaveLength(1);
        expect(grouped.filters[0].type).toBe('BooleanExpr');
      }
    });

    it('should parse grouped filters with multiple items', () => {
      const ast = parseQuery('(game:valorant tag:funny)');
      const grouped = ast.filters[0];
      if (grouped.type === 'GroupedFilter') {
        expect(grouped.filters).toHaveLength(2);
      }
    });

    it('should parse nested groups', () => {
      const ast = parseQuery('((game:valorant))');
      const outer = ast.filters[0];
      expect(outer.type).toBe('GroupedFilter');
      if (outer.type === 'GroupedFilter') {
        const inner = outer.filters[0];
        expect(inner.type).toBe('GroupedFilter');
      }
    });
  });

  describe('Complex Queries', () => {
    it('should parse mixed terms and filters', () => {
      const ast = parseQuery('epic game:valorant');
      expect(ast.terms).toHaveLength(1);
      expect(ast.terms[0].value).toBe('epic');
      expect(ast.filters).toHaveLength(1);
    });

    it('should parse grouped filters with AND logic', () => {
      const ast = parseQuery('(game:valorant OR game:csgo) tag:clutch');
      expect(ast.filters).toHaveLength(2);
      expect(ast.filters[0].type).toBe('GroupedFilter');
      expect(ast.filters[1].type).toBe('Filter');
    });

    it('should parse RFC example query', () => {
      const ast = parseQuery('game:valorant tag:clutch after:last-week votes:>=50 is:featured');
      expect(ast.filters).toHaveLength(5);
    });

    it('should parse complex boolean query', () => {
      const ast = parseQuery('(game:valorant OR game:csgo) (tag:clutch OR tag:ace) -is:nsfw');
      expect(ast.filters).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid filter name', () => {
      expect(() => parseQuery('invalidfilter:value')).toThrow(QueryParseError);
      expect(() => parseQuery('invalidfilter:value')).toThrow(/Unknown filter/);
    });

    it('should throw error for missing filter value', () => {
      expect(() => parseQuery('game:')).toThrow(QueryParseError);
    });

    it('should throw error for invalid range', () => {
      expect(() => parseQuery('votes:100..50')).toThrow(QueryParseError);
      expect(() => parseQuery('votes:100..50')).toThrow(/Invalid range/);
    });

    it('should throw error for query too long', () => {
      const longQuery = 'a'.repeat(1001);
      expect(() => parseQuery(longQuery)).toThrow(QueryParseError);
      expect(() => parseQuery(longQuery)).toThrow(/too long/);
    });

    it('should throw error for too many filters', () => {
      const filters = Array(51).fill('game:valorant').join(' ');
      expect(() => parseQuery(filters)).toThrow(QueryParseError);
      expect(() => parseQuery(filters)).toThrow(/Too many filters/);
    });

    it('should throw error for nesting too deep', () => {
      const deepQuery = '('.repeat(11) + 'game:valorant' + ')'.repeat(11);
      expect(() => parseQuery(deepQuery)).toThrow(QueryParseError);
      expect(() => parseQuery(deepQuery)).toThrow(/Nesting too deep/);
    });
  });

  describe('Real-world Queries from RFC', () => {
    it('should parse: game:valorant tag:clutch votes:>50', () => {
      const ast = parseQuery('game:valorant tag:clutch votes:>50');
      expect(ast.filters).toHaveLength(3);
    });

    it('should parse: (game:valorant OR game:csgo) tag:clutch', () => {
      const ast = parseQuery('(game:valorant OR game:csgo) tag:clutch');
      expect(ast.filters).toHaveLength(2);
    });

    it('should parse: creator:shroud after:last-month votes:>50 sort:popular', () => {
      const ast = parseQuery('creator:shroud after:last-month votes:>50 sort:popular');
      expect(ast.filters).toHaveLength(4);
    });

    it('should parse: epic (game:"League of Legends" OR game:"Dota 2")', () => {
      const ast = parseQuery('epic (game:"League of Legends" OR game:"Dota 2")');
      expect(ast.terms).toHaveLength(1);
      expect(ast.terms[0].value).toBe('epic');
      expect(ast.filters).toHaveLength(1);
    });

    it('should parse: game:minecraft tag:funny -is:nsfw', () => {
      const ast = parseQuery('game:minecraft tag:funny -is:nsfw');
      expect(ast.filters).toHaveLength(3);
      const nsfwFilter = ast.filters[2];
      if (nsfwFilter.type === 'Filter') {
        expect(nsfwFilter.negated).toBe(true);
      }
    });

    it('should parse: after:2025-01-01 before:2025-12-31', () => {
      const ast = parseQuery('after:2025-01-01 before:2025-12-31');
      expect(ast.filters).toHaveLength(2);
    });

    it('should parse: duration:30..60 views:1000..10000', () => {
      const ast = parseQuery('duration:30..60 views:1000..10000');
      expect(ast.filters).toHaveLength(2);
    });
  });
});
