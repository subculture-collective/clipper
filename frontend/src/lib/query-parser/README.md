# Advanced Query Language Parser

A TypeScript parser for the Clipper advanced query language defined in [RFC 002](../../../docs/rfcs/002-advanced-query-language.md).

## Features

- **Complete Grammar Support**: Parses all 15 filter types, comparison operators, date formats, and boolean logic
- **Robust Error Handling**: Provides helpful error messages with suggestions for common mistakes
- **Performance**: <5ms parse time for complex queries (tested)
- **Type-Safe**: Full TypeScript support with comprehensive AST types
- **Well-Tested**: 194 tests covering 100% of grammar rules

## Installation

The query parser is part of the frontend codebase and can be imported directly:

```typescript
import { parseQuery } from '@/lib/query-parser';
```

## Basic Usage

```typescript
import { parseQuery } from '@/lib/query-parser';

// Parse a simple query
const ast = parseQuery('game:valorant tag:clutch votes:>50');

console.log(ast);
// {
//   type: 'Query',
//   terms: [],
//   filters: [
//     { type: 'Filter', name: 'game', value: { type: 'StringValue', value: 'valorant' }, negated: false },
//     { type: 'Filter', name: 'tag', value: { type: 'StringValue', value: 'clutch' }, negated: false },
//     { type: 'Filter', name: 'votes', value: { type: 'RangeValue', operator: '>', min: 50 }, negated: false }
//   ]
// }
```

## Query Syntax

### Search Terms

Free-text search terms:

```
epic moment
"exact phrase"
-excluded
```

### Filters

All supported filters:

| Filter | Type | Example | Description |
|--------|------|---------|-------------|
| `game:` | string | `game:valorant` | Filter by game name |
| `creator:` | string | `creator:shroud` | Filter by clip creator |
| `broadcaster:` | string | `broadcaster:pokimane` | Filter by channel |
| `tag:` | string | `tag:funny` | Filter by tag |
| `language:` | enum | `language:en` | Filter by language code |
| `duration:` | range | `duration:30..60` | Filter by clip duration (seconds) |
| `views:` | range | `views:>1000` | Filter by view count |
| `votes:` | range | `votes:>=10` | Filter by vote score |
| `after:` | date | `after:2025-01-01` | Clips after date |
| `before:` | date | `before:yesterday` | Clips before date |
| `is:` | flag | `is:featured` | Boolean properties |
| `sort:` | enum | `sort:popular` | Sort order |
| `type:` | enum | `type:clips` | Result type |
| `karma:` | range | `karma:>100` | User karma |
| `role:` | enum | `role:moderator` | User role |

### Comparison Operators

For range filters (`duration`, `views`, `votes`, `karma`):

```
votes:>50        # Greater than
votes:>=50       # Greater than or equal
votes:<100       # Less than
votes:<=100      # Less than or equal
votes:50         # Equal to
votes:10..100    # Between (inclusive)
```

### Date Formats

ISO 8601 or relative dates:

```
after:2025-01-15         # ISO date
after:today              # Relative date
after:yesterday
after:last-week
after:last-month
after:last-year
```

### Boolean Logic

```
game:valorant OR game:csgo                  # OR operator
(game:valorant OR game:csgo) tag:clutch     # Grouping with parentheses
-is:nsfw                                    # Negation
```

## Error Handling

The parser provides helpful error messages:

```typescript
import { parseQuery, QueryParseError } from '@/lib/query-parser';

try {
  const ast = parseQuery('unknownfilter:value');
} catch (error) {
  if (error instanceof QueryParseError) {
    console.log(error.code);        // 'QE001'
    console.log(error.message);     // 'Unknown filter: "unknownfilter"'
    console.log(error.suggestions); // ['Did you mean "game:"?', 'Valid filters: ...']
    console.log(error.format());    // Formatted error with suggestions
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `QE001` | Invalid filter name |
| `QE002` | Missing filter value |
| `QE003` | Invalid date format |
| `QE004` | Invalid range |
| `QE005` | Unclosed quote |
| `QE006` | Invalid comparison operator |
| `QE007` | Query too long (>1000 chars) |
| `QE008` | Too many filters (>50) |
| `QE009` | Nesting too deep (>10 levels) |
| `QE010` | Invalid enum value |
| `QE011` | Too many OR clauses (>20) |
| `QE012` | Too many terms (>100) |

## Advanced Usage

### Custom Configuration

```typescript
import { parseQuery } from '@/lib/query-parser';

const ast = parseQuery('long query...', {
  maxQueryLength: 500,    // Override default 1000
  maxFilters: 25,         // Override default 50
  maxNestingDepth: 5,     // Override default 10
  maxOrClauses: 10,       // Override default 20
  maxTerms: 50,          // Override default 100
});
```

### Working with the AST

The parser produces a strongly-typed AST:

```typescript
import { parseQuery, QueryNode, FilterNode } from '@/lib/query-parser';

const ast: QueryNode = parseQuery('game:valorant tag:clutch');

// Iterate over filters
ast.filters.forEach(filter => {
  if (filter.type === 'Filter') {
    console.log(`Filter: ${filter.name} = ${filter.value}`);
  } else if (filter.type === 'BooleanExpr') {
    console.log(`Boolean: ${filter.operator}`);
  } else if (filter.type === 'GroupedFilter') {
    console.log('Grouped filters');
  }
});

// Extract specific filter values
const gameFilters = ast.filters.filter(
  f => f.type === 'Filter' && f.name === 'game'
);
```

## Examples

### Simple Queries

```typescript
// Basic search with filters
parseQuery('game:valorant tag:clutch');

// Negation
parseQuery('game:valorant -tag:nsfw');

// Quoted values
parseQuery('game:"League of Legends"');
```

### Date Filtering

```typescript
// Recent clips
parseQuery('after:yesterday');

// Date range
parseQuery('after:2025-01-01 before:2025-12-31');

// Last week's popular clips
parseQuery('after:last-week votes:>100');
```

### Range Filtering

```typescript
// Popular clips
parseQuery('votes:>100');

// Specific range
parseQuery('votes:50..200');

// Short clips only
parseQuery('duration:<30');

// View count range
parseQuery('views:1000..10000');
```

### Complex Queries

```typescript
// Boolean logic
parseQuery('(game:valorant OR game:csgo) tag:clutch');

// Multiple conditions
parseQuery('(tag:funny OR tag:fail) -is:nsfw');

// Combined filters
parseQuery('creator:shroud after:last-month votes:>50 sort:popular');

// RFC example
parseQuery('game:valorant tag:clutch after:last-week votes:>=50 is:featured');
```

## Performance

The parser is designed for interactive use:

- Parse time: <5ms for typical queries (tested)
- Memory efficient: AST reuses string references
- No external dependencies beyond TypeScript

Performance benchmarks:

- Simple query (3 filters): ~1-2ms
- Complex query (5 filters + OR): ~2-4ms
- Maximum complexity query: ~4-5ms

## Architecture

### Components

1. **Lexer** (`lexer.ts`): Tokenizes the input string
   - Handles words, phrases, numbers, operators, parentheses
   - Tracks position for error reporting
   - Case-insensitive keyword detection

2. **Parser** (`parser.ts`): Builds the AST from tokens
   - Validates filter names and values
   - Handles operator precedence
   - Enforces limits (query length, nesting depth, etc.)

3. **AST** (`ast.ts`): Type definitions for the syntax tree
   - Strongly typed nodes
   - Type guards for safe navigation
   - Source location tracking

4. **Errors** (`errors.ts`): Error handling with helpful messages
   - 12 error types with unique codes
   - Contextual suggestions
   - Position tracking for errors

### Grammar

The parser implements the EBNF grammar from RFC 002:

```ebnf
query         = [ term_list ] , [ filter_list ] ;
term_list     = term , { whitespace , term } ;
term          = [ negation ] , ( word | phrase ) ;
filter_list   = filter_expr , { whitespace , filter_expr } ;
filter_expr   = filter | grouped_filter | boolean_expr ;
filter        = [ negation ] , filter_name , ":" , filter_value ;
grouped_filter = "(" , filter_list , ")" ;
boolean_expr  = filter_expr , whitespace , "OR" , whitespace , filter_expr ;
```

See [RFC 002](../../../docs/rfcs/002-advanced-query-language.md) for complete grammar specification.

## Testing

The parser has comprehensive test coverage:

```bash
# Run all parser tests
npm test -- run src/lib/query-parser

# Run specific test file
npm test -- run src/lib/query-parser/__tests__/lexer.test.ts

# Run with coverage
npm test -- run src/lib/query-parser --coverage
```

Test suites:

- **Lexer Tests** (39 tests): Token generation, edge cases
- **Parser Tests** (58 tests): AST generation, validation
- **Error Tests** (32 tests): Error messages, suggestions
- **Integration Tests** (65 tests): End-to-end, RFC examples, performance

All 194 tests pass with 100% grammar coverage.

## API Reference

### Main Export

```typescript
function parseQuery(query: string, config?: ParserConfig): QueryNode
```

Parses a query string into an AST.

**Parameters:**

- `query`: The query string to parse
- `config` (optional): Parser configuration

**Returns:** QueryNode - The parsed AST

**Throws:** QueryParseError - If the query is invalid

### Types

```typescript
// Main AST node
interface QueryNode {
  type: 'Query';
  terms: TermNode[];
  filters: FilterExprNode[];
}

// Search term
interface TermNode {
  type: 'Term';
  value: string;
  negated: boolean;
}

// Filter node
interface FilterNode {
  type: 'Filter';
  name: FilterName;
  value: FilterValue;
  negated: boolean;
}

// See ast.ts for complete type definitions
```

## Future Enhancements

Planned features (see RFC 002):

- Field boosting: `game:valorant^2`
- Fuzzy matching: `game:valorant~`
- Wildcards: `game:valo*`
- Auto-complete support
- Query builder UI
- Saved queries

## License

MIT - See LICENSE file for details.

## Contributing

See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for development guidelines.

When adding new filter types or operators:

1. Update `ast.ts` with new types
2. Update `lexer.ts` if new tokens needed
3. Update `parser.ts` with parsing logic
4. Add error handling in `errors.ts`
5. Add comprehensive tests
6. Update this README
7. Update RFC 002 specification
