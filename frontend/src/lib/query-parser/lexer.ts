/**
 * Lexer/Tokenizer for the Clipper Query Language
 * Converts query string into tokens for parsing
 */

import type { Position } from './ast';

/**
 * Token types
 */
export enum TokenType {
  // Literals
  WORD = 'WORD',
  PHRASE = 'PHRASE',
  NUMBER = 'NUMBER',

  // Operators
  COLON = 'COLON',
  NEGATION = 'NEGATION',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  RANGE = 'RANGE',
  COMPARISON = 'COMPARISON',

  // Keywords
  OR = 'OR',

  // Special
  EOF = 'EOF',
  WHITESPACE = 'WHITESPACE',
}

/**
 * Token representation
 */
export interface Token {
  type: TokenType;
  value: string;
  position: Position;
}

/**
 * Lexer class for tokenizing query strings
 */
export class Lexer {
  private input: string;
  private position: number;
  private line: number;
  private column: number;
  private tokens: Token[];

  constructor(input: string) {
    this.input = input;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  /**
   * Tokenize the input string
   */
  tokenize(): Token[] {
    this.tokens = [];

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    // Add EOF token
    this.tokens.push(this.createToken(TokenType.EOF, ''));

    return this.tokens;
  }

  /**
   * Scan a single token
   */
  private scanToken(): void {
    const char = this.peek();

    // Skip whitespace
    if (this.isWhitespace(char)) {
      this.skipWhitespace();
      return;
    }

    // Parentheses
    if (char === '(') {
      this.tokens.push(this.createToken(TokenType.LPAREN, char));
      this.advance();
      return;
    }

    if (char === ')') {
      this.tokens.push(this.createToken(TokenType.RPAREN, char));
      this.advance();
      return;
    }

    // Colon
    if (char === ':') {
      this.tokens.push(this.createToken(TokenType.COLON, char));
      this.advance();
      return;
    }

    // Quoted string
    if (char === '"') {
      this.scanPhrase();
      return;
    }

    // Negation (only at start of word/filter)
    if (char === '-' && this.isNegationContext()) {
      this.tokens.push(this.createToken(TokenType.NEGATION, char));
      this.advance();
      return;
    }

    // Comparison operators or range
    if (this.isComparisonStart(char)) {
      this.scanComparison();
      return;
    }

    // Number
    if (this.isDigit(char)) {
      this.scanNumber();
      return;
    }

    // Word (including keywords)
    // Note: hyphens can appear in the middle of words (counter-strike, last-month)
    // but are handled separately for negation at the start
    if (this.isWordChar(char)) {
      this.scanWord();
      return;
    }

    // Hyphen that isn't negation (shouldn't reach here normally)
    if (char === '-') {
      this.scanWord();
      return;
    }

    // Unknown character - skip it
    this.advance();
  }

  /**
   * Scan a quoted phrase
   */
  private scanPhrase(): void {
    const start = this.getCurrentPosition();
    this.advance(); // Skip opening quote

    let value = '';
    let escaped = false;

    while (!this.isAtEnd()) {
      const char = this.peek();

      if (escaped) {
        value += char;
        escaped = false;
        this.advance();
        continue;
      }

      if (char === '\\') {
        escaped = true;
        this.advance();
        continue;
      }

      if (char === '"') {
        this.advance(); // Skip closing quote
        this.tokens.push(this.createTokenAtPosition(TokenType.PHRASE, value, start));
        return;
      }

      value += char;
      this.advance();
    }

    // Unclosed quote - still add the token but mark it
    this.tokens.push(this.createTokenAtPosition(TokenType.PHRASE, value, start));
  }

  /**
   * Scan a word (including keywords)
   */
  private scanWord(): void {
    const start = this.getCurrentPosition();
    let value = '';

    while (!this.isAtEnd() && (this.isWordChar(this.peek()) || this.peek() === '-')) {
      value += this.peek();
      this.advance();
    }

    // Check if it's a keyword
    if (value.toLowerCase() === 'or') {
      this.tokens.push(this.createTokenAtPosition(TokenType.OR, value, start));
    } else {
      this.tokens.push(this.createTokenAtPosition(TokenType.WORD, value, start));
    }
  }

  /**
   * Scan a number
   */
  private scanNumber(): void {
    const start = this.getCurrentPosition();
    let value = '';

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.peek();
      this.advance();
    }

    this.tokens.push(this.createTokenAtPosition(TokenType.NUMBER, value, start));
  }

  /**
   * Scan comparison operator or range
   */
  private scanComparison(): void {
    const start = this.getCurrentPosition();
    const char = this.peek();

    // Check for >= or <=
    if ((char === '>' || char === '<') && this.peekNext() === '=') {
      const value = char + this.peekNext();
      this.advance();
      this.advance();
      this.tokens.push(this.createTokenAtPosition(TokenType.COMPARISON, value, start));
      return;
    }

    // Check for ..
    if (char === '.' && this.peekNext() === '.') {
      this.advance();
      this.advance();
      this.tokens.push(this.createTokenAtPosition(TokenType.RANGE, '..', start));
      return;
    }

    // Single character comparison
    if (char === '>' || char === '<' || char === '=') {
      this.tokens.push(this.createTokenAtPosition(TokenType.COMPARISON, char, start));
      this.advance();
      return;
    }

    // Not a comparison - skip
    this.advance();
  }

  /**
   * Skip whitespace
   */
  private skipWhitespace(): void {
    while (!this.isAtEnd() && this.isWhitespace(this.peek())) {
      this.advance();
    }
  }

  /**
   * Check if current position is a negation context
   */
  private isNegationContext(): boolean {
    // Negation is valid at the start or after whitespace/parentheses
    if (this.position === 0) return true;

    const prevChar = this.input[this.position - 1];
    return this.isWhitespace(prevChar) || prevChar === '(';
  }

  /**
   * Check if character starts a comparison operator
   */
  private isComparisonStart(char: string): boolean {
    return char === '>' || char === '<' || char === '=' || char === '.';
  }

  /**
   * Check if character is whitespace
   */
  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  /**
   * Check if character is a digit
   */
  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  /**
   * Check if character is a word character
   */
  private isWordChar(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      (char >= '0' && char <= '9') ||
      char === '_'
    );
  }

  /**
   * Peek at current character
   */
  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.position];
  }

  /**
   * Peek at next character
   */
  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1];
  }

  /**
   * Advance to next character
   */
  private advance(): void {
    if (this.isAtEnd()) return;

    const char = this.input[this.position];
    this.position++;

    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
  }

  /**
   * Check if at end of input
   */
  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  /**
   * Get current position
   */
  private getCurrentPosition(): Position {
    return {
      line: this.line,
      column: this.column,
      offset: this.position,
    };
  }

  /**
   * Create a token at current position
   */
  private createToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      position: this.getCurrentPosition(),
    };
  }

  /**
   * Create a token at specific position
   */
  private createTokenAtPosition(type: TokenType, value: string, position: Position): Token {
    return {
      type,
      value,
      position,
    };
  }
}

/**
 * Convenience function to tokenize a query string
 */
export function tokenize(query: string): Token[] {
  const lexer = new Lexer(query);
  return lexer.tokenize();
}
