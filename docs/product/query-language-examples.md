---
title: "Query Language Examples and Test Cases"
summary: "This document provides comprehensive examples and test cases for the Clipper Advanced Query Language"
tags: ['product']
area: "product"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Query Language Examples and Test Cases

This document provides comprehensive examples and test cases for the Clipper Advanced Query Language.

**Version:** 1.0.0  
**Date:** 2025-11-09  
**Related Documents:**

- [RFC 002: Advanced Query Language](./rfcs/002-advanced-query-language.md)
- [Query Grammar](./QUERY_GRAMMAR.md)

## Table of Contents

- [Basic Examples](#basic-examples)
- [Advanced Examples](#advanced-examples)
- [Real-World Use Cases](#real-world-use-cases)
- [Edge Cases](#edge-cases)
- [Error Cases](#error-cases)
- [Test Suite](#test-suite)

## Basic Examples

### Free-Text Search

#### Example 1: Single Word

```
valorant
```

**Description:** Search for "valorant" in all text fields  
**Expected:** Clips, creators, games, tags matching "valorant"

#### Example 2: Multiple Words

```
epic clutch moment
```

**Description:** Search for all three words (implicit AND)  
**Expected:** Results containing all three words

#### Example 3: Phrase Search

```
"amazing comeback"
```

**Description:** Search for exact phrase  
**Expected:** Results with phrase "amazing comeback"

#### Example 4: Negated Term

```
-fortnite
```

**Description:** Exclude results containing "fortnite"  
**Expected:** All results except those matching "fortnite"

### Single Filter Queries

#### Example 5: Game Filter

```
game:valorant
```

**Description:** Filter by game name  
**Expected:** Only Valorant clips

#### Example 6: Creator Filter

```
creator:shroud
```

**Description:** Filter by creator username  
**Expected:** Clips created by shroud

#### Example 7: Tag Filter

```
tag:clutch
```

**Description:** Filter by tag  
**Expected:** Clips tagged with "clutch"

#### Example 8: Negated Filter

```
-tag:nsfw
```

**Description:** Exclude NSFW content  
**Expected:** All clips except NSFW

### Multiple Filter Queries

#### Example 9: Two Filters

```
game:valorant tag:clutch
```

**Description:** Game AND tag filter (implicit AND)  
**Expected:** Valorant clips tagged "clutch"

#### Example 10: Three Filters

```
game:valorant tag:clutch votes:>50
```

**Description:** Multiple filters with range  
**Expected:** Valorant clutch clips with >50 votes

#### Example 11: Mixed Filters

```
game:valorant -tag:nsfw sort:popular
```

**Description:** Include, exclude, and sort  
**Expected:** Popular Valorant clips, excluding NSFW

### Range Filters

#### Example 12: Greater Than

```
votes:>50
```

**Description:** Vote score greater than 50  
**Expected:** Clips with more than 50 votes

#### Example 13: Greater or Equal

```
votes:>=100
```

**Description:** Vote score 100 or more  
**Expected:** Clips with 100+ votes

#### Example 14: Less Than

```
duration:<60
```

**Description:** Duration less than 60 seconds  
**Expected:** Clips shorter than 1 minute

#### Example 15: Range Interval

```
votes:10..100
```

**Description:** Vote score between 10 and 100  
**Expected:** Clips with 10-100 votes (inclusive)

### Date Filters

#### Example 16: After Date

```
after:2025-01-01
```

**Description:** Clips after January 1, 2025  
**Expected:** Clips created after that date

#### Example 17: Before Date

```
before:2025-12-31
```

**Description:** Clips before December 31, 2025  
**Expected:** Clips created before that date

#### Example 18: Date Range

```
after:2025-01-01 before:2025-12-31
```

**Description:** Clips in 2025  
**Expected:** Clips from year 2025

#### Example 19: Relative Date

```
after:last-week
```

**Description:** Recent clips from last 7 days  
**Expected:** Clips from past week

### Boolean Flags

#### Example 20: Featured Flag

```
is:featured
```

**Description:** Featured clips only  
**Expected:** Only featured clips

#### Example 21: NSFW Flag

```
is:nsfw
```

**Description:** NSFW content only  
**Expected:** Only NSFW clips

#### Example 22: Negated Flag

```
-is:nsfw
```

**Description:** Exclude NSFW content  
**Expected:** All non-NSFW clips

## Advanced Examples

### Boolean OR Operator

#### Example 23: Simple OR

```
game:valorant OR game:csgo
```

**Description:** Valorant OR CS:GO clips  
**Expected:** Clips from either game

#### Example 24: Multiple OR

```
tag:funny OR tag:fail OR tag:epic
```

**Description:** Three tag options  
**Expected:** Clips with any of the three tags

#### Example 25: OR with Other Filters

```
game:valorant OR game:csgo tag:clutch
```

**Description:** (Valorant OR CS:GO) AND clutch tag  
**Expected:** Clutch clips from either game  
**Note:** Implicit AND has higher precedence

### Grouped Expressions

#### Example 26: Simple Grouping

```
(game:valorant OR game:csgo) tag:clutch
```

**Description:** Explicit grouping for clarity  
**Expected:** Clutch clips from Valorant or CS:GO

#### Example 27: Nested Groups

```
(game:valorant OR game:csgo) (tag:clutch OR tag:ace)
```

**Description:** Two OR groups with implicit AND  
**Expected:** Clips from either game with either tag

#### Example 28: Negated Group

```
-(tag:nsfw OR tag:spoiler)
```

**Description:** Exclude NSFW or spoilers  
**Expected:** Clips without either tag

#### Example 29: Complex Grouping

```
((game:valorant OR game:csgo) tag:clutch) OR (game:apex tag:champion)
```

**Description:** Multiple levels of grouping  
**Expected:** (Valorant/CS:GO clutches) OR (Apex champions)

### Combined Free-Text and Filters

#### Example 30: Text + Filter

```
epic game:valorant
```

**Description:** "epic" in Valorant clips  
**Expected:** Valorant clips containing "epic"

#### Example 31: Phrase + Filters

```
"amazing comeback" game:valorant votes:>50
```

**Description:** Phrase with filters  
**Expected:** Popular Valorant clips with phrase

#### Example 32: Multiple Terms + Filters

```
clutch ace game:valorant after:last-week
```

**Description:** Multiple text terms and filters  
**Expected:** Recent Valorant clips with "clutch" and "ace"

### Sorting

#### Example 33: Sort by Recent

```
game:valorant sort:recent
```

**Description:** Recent Valorant clips  
**Expected:** Valorant clips, newest first

#### Example 34: Sort by Popular

```
tag:funny sort:popular
```

**Description:** Popular funny clips  
**Expected:** Funny clips, sorted by votes/views

#### Example 35: Sort by Relevance (Default)

```
valorant sort:relevance
```

**Description:** Best matches for "valorant"  
**Expected:** Most relevant results first

### Type Filtering

#### Example 36: Clips Only

```
type:clips valorant
```

**Description:** Only clip results  
**Expected:** Clips matching "valorant", no creators/games/tags

#### Example 37: Creators Only

```
type:creators shroud
```

**Description:** Search creators  
**Expected:** Creator profiles matching "shroud"

#### Example 38: Games Only

```
type:games shooter
```

**Description:** Search games  
**Expected:** Games matching "shooter"

## Real-World Use Cases

### Use Case 1: Find Recent Popular Content

**Scenario:** User wants to see what's trending this week

```
after:last-week votes:>100 sort:popular
```

**Expected Results:**

- Clips from past 7 days
- Minimum 100 votes
- Sorted by popularity (votes + views)

### Use Case 2: Find Specific Content Type

**Scenario:** User wants Valorant clutch plays with good engagement

```
game:valorant tag:clutch votes:>=50 -is:nsfw sort:recent
```

**Expected Results:**

- Valorant game only
- Tagged as clutch
- At least 50 votes
- No NSFW content
- Recent first

### Use Case 3: Multi-Game Search

**Scenario:** User likes FPS games and wants clutch moments

```
(game:valorant OR game:csgo OR game:apex) tag:clutch after:last-month votes:>20
```

**Expected Results:**

- Clips from any of the three games
- Tagged as clutch
- From last 30 days
- More than 20 votes

### Use Case 4: Creator Discovery

**Scenario:** Find active creators with high karma

```
type:creators karma:>500
```

**Expected Results:**

- Creator profiles only
- Karma points above 500

### Use Case 5: Clean Family-Friendly Content

**Scenario:** Parent wants safe content for kids

```
game:minecraft -is:nsfw tag:creative votes:>10 sort:popular
```

**Expected Results:**

- Minecraft clips
- No NSFW content
- Creative tag
- Minimum quality threshold (10+ votes)
- Most popular first

### Use Case 6: Language-Specific Search

**Scenario:** User wants content in their language

```
language:es tag:funny after:yesterday
```

**Expected Results:**

- Spanish language clips
- Funny tag
- Very recent (last 24 hours)

### Use Case 7: Short Highlight Clips

**Scenario:** User wants quick, high-quality moments

```
duration:<30 votes:>100 -is:nsfw sort:popular
```

**Expected Results:**

- Under 30 seconds
- Highly voted (100+)
- No NSFW
- Best ones first

### Use Case 8: Specific Creator Search

**Scenario:** Fan wants recent content from favorite creator

```
creator:shroud after:last-week sort:recent
```

**Expected Results:**

- All clips by shroud
- From past week
- Newest first

### Use Case 9: Game + Multiple Tags

**Scenario:** Looking for specific type of gameplay

```
game:"League of Legends" (tag:pentakill OR tag:outplay) votes:>=50
```

**Expected Results:**

- League of Legends clips
- Either pentakill or outplay tag
- Quality threshold (50+ votes)

### Use Case 10: Discovery Mode

**Scenario:** User wants to find new popular content

```
after:today votes:>50 -creator:known-creator sort:popular
```

**Expected Results:**

- Today's clips
- Popular (50+ votes)
- From new/unknown creators
- Best first

## Edge Cases

### Empty and Whitespace

#### Edge Case 1: Empty Query

```

```

**Expected:** Return default results (most recent clips)

#### Edge Case 2: Only Whitespace

```
   
```

**Expected:** Same as empty query

#### Edge Case 3: Multiple Spaces

```
game:valorant    tag:clutch
```

**Expected:** Same as single space between filters

### Special Characters in Values

#### Edge Case 4: Game Name with Spaces

```
game:"League of Legends"
```

**Expected:** Match game "League of Legends"

#### Edge Case 5: Programming Language

```
"C++"
```

**Expected:** Search for literal "C++"

#### Edge Case 6: Special Characters in Phrase

```
"What?!? Amazing!!!"
```

**Expected:** Search for exact phrase including punctuation

### Quotes and Escaping

#### Edge Case 7: Escaped Quote

```
tag:"\"quoted\" text"
```

**Expected:** Tag value is: "quoted" text

#### Edge Case 8: Backslash in Value

```
"C:\\Users\\path"
```

**Expected:** Search for path with backslashes

### Numbers and Ranges

#### Edge Case 9: Zero Values

```
votes:0
```

**Expected:** Clips with exactly 0 votes

#### Edge Case 10: Equal Range

```
votes:50..50
```

**Expected:** Clips with exactly 50 votes

#### Edge Case 11: Large Numbers

```
views:>1000000
```

**Expected:** Clips with over 1 million views

### Dates

#### Edge Case 12: Leap Year Date

```
after:2024-02-29
```

**Expected:** Valid date (2024 is leap year)

#### Edge Case 13: Same Date Range

```
after:2025-01-01 before:2025-01-01
```

**Expected:** Clips from exactly that date

### Boolean Logic

#### Edge Case 14: Redundant OR

```
game:valorant OR game:valorant
```

**Expected:** Same as single filter (deduplicated)

#### Edge Case 15: Contradictory Filters

```
game:valorant -game:valorant
```

**Expected:** No results (logical contradiction)

#### Edge Case 16: Multiple Negations

```
-tag:nsfw -tag:spoiler -tag:gore
```

**Expected:** Exclude all three tags

### Case Sensitivity

#### Edge Case 17: Filter Name Case

```
GAME:valorant
Game:Valorant
```

**Expected:** Both treated as game:valorant

#### Edge Case 18: Value Case

```
game:VALORANT
game:Valorant
game:valorant
```

**Expected:** All match same game (case-insensitive matching)

#### Edge Case 19: Operator Case

```
game:valorant or game:csgo
game:valorant OR game:csgo
```

**Expected:** Both treated as OR operator

## Error Cases

### Syntax Errors

#### Error 1: Unclosed Quote

```
game:"League of Legends
```

**Error Code:** QE005  
**Error Message:** Unclosed quote at position 5

#### Error 2: Unclosed Parenthesis

```
(game:valorant OR game:csgo
```

**Error Code:** QE009  
**Error Message:** Unclosed parenthesis at position 1

#### Error 3: Missing Filter Value

```
game:
```

**Error Code:** QE002  
**Error Message:** Filter 'game' requires a value

#### Error 4: Invalid Operator

```
game=valorant
```

**Error Code:** QE001  
**Error Message:** Invalid filter syntax, expected 'game:value'

### Validation Errors

#### Error 5: Invalid Date Format

```
after:2025/01/01
```

**Error Code:** QE003  
**Error Message:** Invalid date format, expected YYYY-MM-DD

#### Error 6: Invalid Date

```
after:2025-02-30
```

**Error Code:** QE003  
**Error Message:** Invalid date: February 30th does not exist

#### Error 7: Invalid Range

```
votes:100..50
```

**Error Code:** QE004  
**Error Message:** Invalid range: min (100) > max (50)

#### Error 8: Invalid Comparison

```
votes:><50
```

**Error Code:** QE006  
**Error Message:** Invalid comparison operator

#### Error 9: Unknown Filter

```
unknownfilter:value
```

**Behavior:** Treated as free-text search  
**Note:** Not an error, for forward compatibility

#### Error 10: Invalid Enum Value

```
sort:invalid
```

**Error Code:** QE010  
**Error Message:** Invalid value 'invalid' for filter 'sort'. Expected: relevance, recent, popular

### Resource Errors

#### Error 11: Query Too Long

```
game:valorant tag:tag1 tag:tag2 ... [1001 characters total]
```

**Error Code:** QE007  
**Error Message:** Query exceeds maximum length of 1000 characters

#### Error 12: Too Many Filters

```
tag:a tag:b tag:c ... [51 filters]
```

**Error Code:** QE008  
**Error Message:** Query exceeds maximum of 50 filters

#### Error 13: Nesting Too Deep

```
((((((((((game:valorant))))))))))
```

**Error Code:** QE009  
**Error Message:** Nesting depth exceeds maximum of 10 levels

## Test Suite

### Lexer Tests

```javascript
// Token type constants
const TOKEN = {
  WORD: 'WORD',
  PHRASE: 'PHRASE',
  FILTER_NAME: 'FILTER_NAME',
  FILTER_VALUE: 'FILTER_VALUE',
  COLON: 'COLON',
  NEGATION: 'NEGATION',
  OR: 'OR',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  WHITESPACE: 'WHITESPACE',
  EOF: 'EOF'
};

// Test cases for lexer
const lexerTests = [
  {
    input: 'game:valorant',
    expected: [
      { type: TOKEN.FILTER_NAME, value: 'game' },
      { type: TOKEN.COLON, value: ':' },
      { type: TOKEN.FILTER_VALUE, value: 'valorant' },
      { type: TOKEN.EOF }
    ]
  },
  {
    input: '"epic moment"',
    expected: [
      { type: TOKEN.PHRASE, value: 'epic moment' },
      { type: TOKEN.EOF }
    ]
  },
  {
    input: '-tag:nsfw',
    expected: [
      { type: TOKEN.NEGATION, value: '-' },
      { type: TOKEN.FILTER_NAME, value: 'tag' },
      { type: TOKEN.COLON, value: ':' },
      { type: TOKEN.FILTER_VALUE, value: 'nsfw' },
      { type: TOKEN.EOF }
    ]
  },
  {
    input: 'game:valorant OR game:csgo',
    expected: [
      { type: TOKEN.FILTER_NAME, value: 'game' },
      { type: TOKEN.COLON, value: ':' },
      { type: TOKEN.FILTER_VALUE, value: 'valorant' },
      { type: TOKEN.WHITESPACE, value: ' ' },
      { type: TOKEN.OR, value: 'OR' },
      { type: TOKEN.WHITESPACE, value: ' ' },
      { type: TOKEN.FILTER_NAME, value: 'game' },
      { type: TOKEN.COLON, value: ':' },
      { type: TOKEN.FILTER_VALUE, value: 'csgo' },
      { type: TOKEN.EOF }
    ]
  }
];
```

### Parser Tests

```javascript
// AST node types
const AST = {
  QUERY: 'Query',
  TERM: 'Term',
  FILTER: 'Filter',
  OR_EXPR: 'OrExpr',
  AND_EXPR: 'AndExpr',
  GROUP: 'Group'
};

// Test cases for parser
const parserTests = [
  {
    input: 'game:valorant',
    expected: {
      type: AST.QUERY,
      children: [{
        type: AST.FILTER,
        name: 'game',
        value: 'valorant',
        negated: false
      }]
    }
  },
  {
    input: 'game:valorant tag:clutch',
    expected: {
      type: AST.QUERY,
      children: [{
        type: AST.AND_EXPR,
        children: [
          { type: AST.FILTER, name: 'game', value: 'valorant' },
          { type: AST.FILTER, name: 'tag', value: 'clutch' }
        ]
      }]
    }
  },
  {
    input: 'game:valorant OR game:csgo',
    expected: {
      type: AST.QUERY,
      children: [{
        type: AST.OR_EXPR,
        children: [
          { type: AST.FILTER, name: 'game', value: 'valorant' },
          { type: AST.FILTER, name: 'game', value: 'csgo' }
        ]
      }]
    }
  }
];
```

### Validator Tests

```javascript
const validatorTests = [
  // Valid queries
  { input: 'game:valorant', valid: true },
  { input: 'votes:10..100', valid: true },
  { input: 'after:2025-01-01', valid: true },
  
  // Invalid queries
  { input: 'game:', valid: false, error: 'QE002' },
  { input: 'votes:100..50', valid: false, error: 'QE004' },
  { input: 'after:2025-02-30', valid: false, error: 'QE003' },
  { input: 'sort:invalid', valid: false, error: 'QE010' }
];
```

### Integration Tests

```javascript
const integrationTests = [
  {
    name: 'Simple game filter',
    query: 'game:valorant',
    expectedSQL: "WHERE game_name ILIKE '%valorant%'",
    expectedOpenSearch: {
      bool: {
        must: [{ match: { game_name: 'valorant' } }]
      }
    }
  },
  {
    name: 'Multiple filters with negation',
    query: 'game:valorant -tag:nsfw votes:>50',
    expectedSQL: "WHERE game_name ILIKE '%valorant%' AND NOT 'nsfw' = ANY(tags) AND vote_score > 50",
    expectedOpenSearch: {
      bool: {
        must: [
          { match: { game_name: 'valorant' } },
          { range: { vote_score: { gt: 50 } } }
        ],
        must_not: [
          { term: { tags: 'nsfw' } }
        ]
      }
    }
  }
];
```

## Performance Test Cases

### Benchmark Queries

```
1. Simple query: game:valorant
   Target: <5ms parse time

2. Complex query: (game:valorant OR game:csgo) tag:clutch -is:nsfw votes:>50 after:last-week
   Target: <10ms parse time

3. Max filters: tag:a tag:b ... [50 filters]
   Target: <50ms parse time

4. Deep nesting: ((((((((((filter))))))))))
   Target: <20ms parse time

5. Long phrase: "very long phrase with many words that should still parse quickly"
   Target: <5ms parse time
```

## Compatibility Matrix

| Client | Version | Query Language Support | Notes |
|--------|---------|------------------------|-------|
| Web Frontend | v1.0+ | ✅ Full | Auto-complete enabled |
| Mobile App | v1.0+ | ✅ Full | Auto-complete enabled |
| API | v1.0+ | ✅ Full | Query param: `?q=` |
| Legacy API | v0.x | ⚠️ Fallback | Uses structured params |

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-11-09  
**Maintainer:** Clipper Engineering Team
