/**
 * Clipper Query Language Parser
 * 
 * A parser for the advanced query language defined in RFC 002.
 * Converts human-readable queries into an Abstract Syntax Tree (AST)
 * with robust error handling and helpful messages.
 * 
 * @example
 * ```typescript
 * import { parseQuery } from './query-parser';
 * 
 * const ast = parseQuery('game:valorant tag:clutch votes:>50');
 * console.log(ast);
 * ```
 * 
 * @module query-parser
 */

export * from './ast';
export * from './errors';
export * from './lexer';
export * from './parser';

// Re-export main parsing function for convenience
export { parseQuery } from './parser';
