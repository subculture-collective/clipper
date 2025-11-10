/**
 * Tests for the Lexer/Tokenizer
 */

import { describe, it, expect } from 'vitest';
import { Lexer, TokenType, tokenize } from '../lexer';

describe('Lexer', () => {
  describe('Basic Tokens', () => {
    it('should tokenize simple words', () => {
      const tokens = tokenize('hello world');
      expect(tokens).toHaveLength(3); // hello, world, EOF
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[0].value).toBe('hello');
      expect(tokens[1].type).toBe(TokenType.WORD);
      expect(tokens[1].value).toBe('world');
      expect(tokens[2].type).toBe(TokenType.EOF);
    });

    it('should tokenize quoted phrases', () => {
      const tokens = tokenize('"hello world"');
      expect(tokens).toHaveLength(2); // phrase, EOF
      expect(tokens[0].type).toBe(TokenType.PHRASE);
      expect(tokens[0].value).toBe('hello world');
    });

    it('should tokenize numbers', () => {
      const tokens = tokenize('123 456');
      expect(tokens).toHaveLength(3); // 123, 456, EOF
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('123');
      expect(tokens[1].type).toBe(TokenType.NUMBER);
      expect(tokens[1].value).toBe('456');
    });

    it('should tokenize colon', () => {
      const tokens = tokenize('game:');
      expect(tokens).toHaveLength(3); // game, :, EOF
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[1].type).toBe(TokenType.COLON);
    });

    it('should tokenize parentheses', () => {
      const tokens = tokenize('(hello)');
      expect(tokens).toHaveLength(4); // (, hello, ), EOF
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[1].type).toBe(TokenType.WORD);
      expect(tokens[2].type).toBe(TokenType.RPAREN);
    });
  });

  describe('Operators', () => {
    it('should tokenize negation at start', () => {
      const tokens = tokenize('-game');
      expect(tokens[0].type).toBe(TokenType.NEGATION);
      expect(tokens[1].type).toBe(TokenType.WORD);
      expect(tokens[1].value).toBe('game');
    });

    it('should tokenize negation after whitespace', () => {
      const tokens = tokenize('hello -world');
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[1].type).toBe(TokenType.NEGATION);
      expect(tokens[2].type).toBe(TokenType.WORD);
      expect(tokens[2].value).toBe('world');
    });

    it('should not tokenize hyphen in middle of word as negation', () => {
      const tokens = tokenize('counter-strike');
      expect(tokens).toHaveLength(2); // counter-strike, EOF
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[0].value).toBe('counter-strike');
    });

    it('should tokenize comparison operators', () => {
      const tokens = tokenize('> >= < <= =');
      expect(tokens[0].type).toBe(TokenType.COMPARISON);
      expect(tokens[0].value).toBe('>');
      expect(tokens[1].type).toBe(TokenType.COMPARISON);
      expect(tokens[1].value).toBe('>=');
      expect(tokens[2].type).toBe(TokenType.COMPARISON);
      expect(tokens[2].value).toBe('<');
      expect(tokens[3].type).toBe(TokenType.COMPARISON);
      expect(tokens[3].value).toBe('<=');
      expect(tokens[4].type).toBe(TokenType.COMPARISON);
      expect(tokens[4].value).toBe('=');
    });

    it('should tokenize range operator', () => {
      const tokens = tokenize('10..20');
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('10');
      expect(tokens[1].type).toBe(TokenType.RANGE);
      expect(tokens[1].value).toBe('..');
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[2].value).toBe('20');
    });

    it('should tokenize OR keyword', () => {
      const tokens = tokenize('game:valorant OR game:csgo');
      expect(tokens[3].type).toBe(TokenType.OR);
      expect(tokens[3].value).toBe('OR');
    });

    it('should tokenize OR case-insensitively', () => {
      const tokens = tokenize('or Or oR');
      expect(tokens[0].type).toBe(TokenType.OR);
      expect(tokens[1].type).toBe(TokenType.OR);
      expect(tokens[2].type).toBe(TokenType.OR);
    });
  });

  describe('Quoted Strings', () => {
    it('should handle escaped quotes', () => {
      const tokens = tokenize('"hello \\"world\\""');
      expect(tokens[0].type).toBe(TokenType.PHRASE);
      expect(tokens[0].value).toBe('hello "world"');
    });

    it('should handle empty quotes', () => {
      const tokens = tokenize('""');
      expect(tokens[0].type).toBe(TokenType.PHRASE);
      expect(tokens[0].value).toBe('');
    });

    it('should handle unclosed quote', () => {
      const tokens = tokenize('"hello world');
      expect(tokens[0].type).toBe(TokenType.PHRASE);
      expect(tokens[0].value).toBe('hello world');
    });

    it('should handle quotes with special characters', () => {
      const tokens = tokenize('"game: League of Legends"');
      expect(tokens[0].type).toBe(TokenType.PHRASE);
      expect(tokens[0].value).toBe('game: League of Legends');
    });
  });

  describe('Complex Queries', () => {
    it('should tokenize simple filter', () => {
      const tokens = tokenize('game:valorant');
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[0].value).toBe('game');
      expect(tokens[1].type).toBe(TokenType.COLON);
      expect(tokens[2].type).toBe(TokenType.WORD);
      expect(tokens[2].value).toBe('valorant');
    });

    it('should tokenize filter with quoted value', () => {
      const tokens = tokenize('game:"League of Legends"');
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[1].type).toBe(TokenType.COLON);
      expect(tokens[2].type).toBe(TokenType.PHRASE);
      expect(tokens[2].value).toBe('League of Legends');
    });

    it('should tokenize negated filter', () => {
      const tokens = tokenize('-game:fortnite');
      expect(tokens[0].type).toBe(TokenType.NEGATION);
      expect(tokens[1].type).toBe(TokenType.WORD);
      expect(tokens[1].value).toBe('game');
      expect(tokens[2].type).toBe(TokenType.COLON);
      expect(tokens[3].type).toBe(TokenType.WORD);
      expect(tokens[3].value).toBe('fortnite');
    });

    it('should tokenize range filter', () => {
      const tokens = tokenize('votes:>50');
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[1].type).toBe(TokenType.COLON);
      expect(tokens[2].type).toBe(TokenType.COMPARISON);
      expect(tokens[2].value).toBe('>');
      expect(tokens[3].type).toBe(TokenType.NUMBER);
      expect(tokens[3].value).toBe('50');
    });

    it('should tokenize grouped filters', () => {
      const tokens = tokenize('(game:valorant OR game:csgo)');
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[1].type).toBe(TokenType.WORD);
      expect(tokens[4].type).toBe(TokenType.OR);
      expect(tokens[8].type).toBe(TokenType.RPAREN);
    });

    it('should tokenize complex query', () => {
      const query = 'epic (game:valorant OR game:csgo) -is:nsfw votes:>=10';
      const tokens = tokenize(query);
      
      expect(tokens[0].value).toBe('epic');
      expect(tokens[1].type).toBe(TokenType.LPAREN);
      expect(tokens[8].type).toBe(TokenType.RPAREN);
      expect(tokens[9].type).toBe(TokenType.NEGATION);
      expect(tokens[13].type).toBe(TokenType.COMPARISON);
      expect(tokens[13].value).toBe('>=');
    });
  });

  describe('Whitespace Handling', () => {
    it('should skip multiple spaces', () => {
      const tokens = tokenize('hello    world');
      expect(tokens).toHaveLength(3); // hello, world, EOF
      expect(tokens[0].value).toBe('hello');
      expect(tokens[1].value).toBe('world');
    });

    it('should skip tabs and newlines', () => {
      const tokens = tokenize('hello\t\nworld');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].value).toBe('hello');
      expect(tokens[1].value).toBe('world');
    });

    it('should handle leading and trailing whitespace', () => {
      const tokens = tokenize('  hello  ');
      expect(tokens).toHaveLength(2); // hello, EOF
      expect(tokens[0].value).toBe('hello');
    });
  });

  describe('Position Tracking', () => {
    it('should track position for simple word', () => {
      const tokens = tokenize('hello');
      expect(tokens[0].position.line).toBe(1);
      expect(tokens[0].position.column).toBe(1);
      expect(tokens[0].position.offset).toBe(0);
    });

    it('should track position after whitespace', () => {
      const tokens = tokenize('  hello');
      expect(tokens[0].position.column).toBe(3);
    });

    it('should track line numbers', () => {
      const tokens = tokenize('hello\nworld');
      expect(tokens[0].position.line).toBe(1);
      expect(tokens[1].position.line).toBe(2);
      expect(tokens[1].position.column).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const tokens = tokenize('');
      expect(tokens).toHaveLength(1); // Only EOF
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle only whitespace', () => {
      const tokens = tokenize('   ');
      expect(tokens).toHaveLength(1); // Only EOF
    });

    it('should handle special characters', () => {
      const tokens = tokenize('!@#$%');
      // These should be skipped or handled gracefully
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    it('should handle mixed content', () => {
      const tokens = tokenize('word123');
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[0].value).toBe('word123');
    });

    it('should handle underscores in words', () => {
      const tokens = tokenize('hello_world');
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[0].value).toBe('hello_world');
    });
  });

  describe('Real-world Queries', () => {
    it('should tokenize RFC example 1', () => {
      const tokens = tokenize('game:valorant tag:clutch votes:>50');
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.WORD, value: 'game' })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.WORD, value: 'valorant' })
      );
    });

    it('should tokenize RFC example 2', () => {
      const tokens = tokenize('(game:valorant OR game:csgo) tag:clutch -is:nsfw');
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.OR })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.NEGATION })
      );
    });

    it('should tokenize RFC example 3', () => {
      const tokens = tokenize('creator:shroud after:last-month votes:>50 sort:popular');
      expect(tokens.filter(t => t.type === TokenType.WORD)).toHaveLength(7);
      expect(tokens.filter(t => t.type === TokenType.COLON)).toHaveLength(4);
    });

    it('should tokenize RFC example 4', () => {
      const tokens = tokenize('game:"League of Legends" tag:funny -is:nsfw');
      const phraseToken = tokens.find(t => t.type === TokenType.PHRASE);
      expect(phraseToken?.value).toBe('League of Legends');
    });

    it('should tokenize date range', () => {
      const tokens = tokenize('after:2025-01-01 before:2025-12-31');
      expect(tokens.filter(t => t.type === TokenType.WORD)).toHaveLength(4);
    });

    it('should tokenize duration range', () => {
      const tokens = tokenize('duration:30..60');
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[3].type).toBe(TokenType.RANGE);
      expect(tokens[4].type).toBe(TokenType.NUMBER);
    });
  });
});
