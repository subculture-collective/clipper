# Clipper Query Language Grammar v1.0.0

This document provides the formal grammar specification for the Clipper Advanced Query Language using Extended Backus-Naur Form (EBNF) notation.

## Table of Contents

- [Overview](#overview)
- [Notation Conventions](#notation-conventions)
- [Complete Grammar](#complete-grammar)
- [Grammar Rules Explained](#grammar-rules-explained)
- [Examples with Parse Trees](#examples-with-parse-trees)
- [Validation Rules](#validation-rules)
- [Version History](#version-history)

## Overview

The Clipper Query Language enables users to construct sophisticated search queries using an intuitive, human-readable syntax. This grammar specification defines the complete syntax accepted by the query parser.

**Version:** 1.0.0  
**Status:** Approved  
**Date:** 2025-11-09

## Notation Conventions

This grammar uses EBNF notation with the following conventions:

| Symbol | Meaning |
|--------|---------|
| `=` | Definition |
| `,` | Concatenation (AND) |
| `\|` | Alternation (OR) |
| `[ ... ]` | Optional (zero or one occurrence) |
| `{ ... }` | Repetition (zero or more occurrences) |
| `( ... )` | Grouping |
| `" ... "` | Terminal string (literal) |
| `' ... '` | Terminal string (literal, alternative) |
| `(* ... *)` | Comment |
| `? ... ?` | Special sequence (prose description) |
| `-` | Exclusion |

## Complete Grammar

```ebnf
(* ============================================================
   Clipper Query Language Grammar v1.0.0
   
   This grammar defines the syntax for advanced search queries
   in the Clipper platform.
   ============================================================ *)

(* Top-level query structure *)
query = [ expression ] ;

expression = term_list 
           | filter_list
           | term_list , whitespace , filter_list
           | filter_list , whitespace , term_list ;

(* Free-text search terms *)
term_list = term , { whitespace , term } ;

term = [ negation ] , ( word | phrase ) ;

word = word_start , { word_char } ;

word_start = letter ;

word_char = letter | digit | hyphen | underscore ;

phrase = quote , phrase_content , quote ;

phrase_content = { phrase_char | escaped_quote } ;

phrase_char = ? any Unicode character except quote and backslash ? ;

escaped_quote = backslash , quote ;

(* Filter expressions *)
filter_list = filter_expr , { whitespace , filter_expr } ;

filter_expr = or_expr ;

or_expr = and_expr , { whitespace , "OR" , whitespace , and_expr } ;

and_expr = filter_term , { whitespace , filter_term } ;

filter_term = filter | grouped_expr ;

filter = [ negation ] , filter_name , colon , filter_value ;

grouped_expr = lparen , filter_expr , rparen ;

(* Filter names *)
filter_name = clip_filter 
            | user_filter 
            | universal_filter ;

clip_filter = "game" 
            | "creator" 
            | "broadcaster" 
            | "tag" 
            | "language" 
            | "duration" 
            | "views" 
            | "votes" 
            | "after" 
            | "before" 
            | "is" ;

user_filter = "karma" 
            | "role" ;

universal_filter = "type" 
                 | "sort" ;

(* Filter values *)
filter_value = range_value 
             | date_value 
             | flag_value 
             | enum_value 
             | string_value ;

(* Range values (numeric comparisons) *)
range_value = comparison_value | interval_value ;

comparison_value = comparison_op , number ;

comparison_op = gt | gte | lt | lte | eq ;

gt = ">" ;

gte = ">=" ;

lt = "<" ;

lte = "<=" ;

eq = "=" ;

interval_value = number , ".." , number ;

number = positive_number | zero ;

positive_number = nonzero_digit , { digit } ;

zero = "0" ;

(* Date values *)
date_value = iso_date | relative_date ;

iso_date = year , hyphen , month , hyphen , day ;

year = digit , digit , digit , digit ;

month = "01" | "02" | "03" | "04" | "05" | "06" 
      | "07" | "08" | "09" | "10" | "11" | "12" ;

day = "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10"
    | "11" | "12" | "13" | "14" | "15" | "16" | "17" | "18" | "19" | "20"
    | "21" | "22" | "23" | "24" | "25" | "26" | "27" | "28" | "29" | "30"
    | "31" ;

relative_date = "today" 
              | "yesterday" 
              | "last-week" 
              | "last-month" 
              | "last-year" ;

(* Boolean flag values *)
flag_value = "featured" | "nsfw" ;

(* Enumeration values *)
enum_value = type_enum | sort_enum | language_enum | role_enum ;

type_enum = "clips" | "creators" | "games" | "tags" | "all" ;

sort_enum = "relevance" | "recent" | "popular" ;

language_enum = iso_639_1_code ;

iso_639_1_code = letter , letter ;

role_enum = "admin" | "moderator" | "user" ;

(* String values *)
string_value = word | phrase ;

(* Character classes *)
letter = lowercase | uppercase ;

lowercase = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" 
          | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" 
          | "u" | "v" | "w" | "x" | "y" | "z" ;

uppercase = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" 
          | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" 
          | "U" | "V" | "W" | "X" | "Y" | "Z" ;

digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;

nonzero_digit = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;

(* Special characters *)
negation = hyphen ;

hyphen = "-" ;

underscore = "_" ;

colon = ":" ;

quote = '"' ;

backslash = "\\" ;

lparen = "(" ;

rparen = ")" ;

whitespace = space | tab | newline | carriage_return ;

space = " " ;

tab = "\t" ;

newline = "\n" ;

carriage_return = "\r" ;

(* End of grammar *)
```

## Grammar Rules Explained

### Top-Level Structure

#### `query`

The root of any query. Can be empty, contain only free-text terms, only filters, or a combination.

**Examples:**

```
valorant
game:valorant
valorant game:valorant
game:valorant tag:clutch
```

#### `expression`

The main structure that can contain terms and/or filters in any order.

### Free-Text Search

#### `term_list`

One or more search terms separated by whitespace.

**Examples:**

```
valorant
epic moment
amazing play clutch
```

#### `term`

A single search term, optionally negated.

**Examples:**

```
valorant
-fortnite
"epic moment"
-"not this"
```

#### `word`

A simple word composed of letters, digits, hyphens, and underscores. Must start with a letter.

**Valid:**

```
valorant
CS-GO
player_123
```

**Invalid:**

```
123player  (starts with digit)
-valorant  (starts with hyphen - treated as negation)
_test      (starts with underscore)
```

#### `phrase`

A quoted string that can contain spaces and special characters.

**Examples:**

```
"League of Legends"
"epic moment"
"player said \"wow\""  (with escaped quote)
```

### Filter Expressions

#### `filter_list`

One or more filter expressions that can include boolean operators.

**Examples:**

```
game:valorant
game:valorant tag:clutch
game:valorant OR game:csgo
(game:valorant OR game:csgo) tag:clutch
```

#### `or_expr`

Boolean OR between filter expressions. OR has lower precedence than implicit AND.

**Examples:**

```
game:valorant OR game:csgo
tag:funny OR tag:fail OR tag:epic
```

#### `and_expr`

Implicit AND between adjacent filters (no operator needed).

**Examples:**

```
game:valorant tag:clutch           (AND is implicit)
game:valorant tag:clutch votes:>50 (multiple ANDs)
```

#### `filter`

A key-value pair with optional negation.

**Structure:** `[negation] filter_name : filter_value`

**Examples:**

```
game:valorant
-tag:nsfw
votes:>50
after:2025-01-01
```

#### `grouped_expr`

Filters grouped with parentheses to control precedence.

**Examples:**

```
(game:valorant OR game:csgo)
(tag:funny OR tag:fail) -is:nsfw
game:valorant (tag:clutch OR tag:ace)
```

### Filter Names

#### `clip_filter`

Filters specific to clip search:

- `game:` - Game name or ID
- `creator:` - Clip creator username
- `broadcaster:` - Channel/broadcaster username
- `tag:` - Tag name
- `language:` - Language code
- `duration:` - Clip duration in seconds
- `views:` - View count
- `votes:` - Vote score
- `after:` - Created after date
- `before:` - Created before date
- `is:` - Boolean flags

#### `user_filter`

Filters for user/creator search:

- `karma:` - Karma points
- `role:` - User role

#### `universal_filter`

Filters applicable to all search types:

- `type:` - Result type (clips, creators, games, tags, all)
- `sort:` - Sort order (relevance, recent, popular)

### Filter Values

#### `range_value`

Numeric comparisons or intervals.

**Comparison operators:**

```
votes:>50      (greater than)
votes:>=50     (greater than or equal)
votes:<100     (less than)
votes:<=100    (less than or equal)
votes:=50      (exactly equal)
```

**Intervals:**

```
votes:10..100       (between 10 and 100, inclusive)
duration:30..60     (30 to 60 seconds)
```

#### `date_value`

ISO 8601 dates or relative dates.

**ISO dates:**

```
after:2025-01-01
before:2025-12-31
```

**Relative dates:**

```
after:today
after:yesterday
after:last-week
after:last-month
after:last-year
```

#### `flag_value`

Boolean properties used with `is:` filter.

**Values:**

```
is:featured
is:nsfw
-is:nsfw
```

#### `enum_value`

Predefined enumeration values for specific filters.

**Type enum:**

```
type:clips
type:creators
type:games
type:tags
type:all
```

**Sort enum:**

```
sort:relevance
sort:recent
sort:popular
```

**Language enum:** ISO 639-1 two-letter codes

```
language:en
language:es
language:fr
```

**Role enum:**

```
role:admin
role:moderator
role:user
```

## Examples with Parse Trees

### Example 1: Simple Filter Query

**Query:** `game:valorant`

**Parse Tree:**

```
query
└── expression
    └── filter_list
        └── filter_expr
            └── or_expr
                └── and_expr
                    └── filter_term
                        └── filter
                            ├── filter_name: "game"
                            ├── colon: ":"
                            └── filter_value
                                └── string_value
                                    └── word: "valorant"
```

### Example 2: Multiple Filters with Negation

**Query:** `game:valorant -tag:nsfw votes:>50`

**Parse Tree:**

```
query
└── expression
    └── filter_list
        └── filter_expr
            └── or_expr
                └── and_expr
                    ├── filter_term
                    │   └── filter: "game:valorant"
                    ├── whitespace
                    ├── filter_term
                    │   └── filter
                    │       ├── negation: "-"
                    │       └── "tag:nsfw"
                    ├── whitespace
                    └── filter_term
                        └── filter: "votes:>50"
```

### Example 3: Boolean OR Expression

**Query:** `game:valorant OR game:csgo`

**Parse Tree:**

```
query
└── expression
    └── filter_list
        └── filter_expr
            └── or_expr
                ├── and_expr
                │   └── filter_term
                │       └── filter: "game:valorant"
                ├── whitespace
                ├── "OR"
                ├── whitespace
                └── and_expr
                    └── filter_term
                        └── filter: "game:csgo"
```

### Example 4: Grouped Expression

**Query:** `(game:valorant OR game:csgo) tag:clutch`

**Parse Tree:**

```
query
└── expression
    └── filter_list
        └── filter_expr
            └── or_expr
                └── and_expr
                    ├── filter_term
                    │   └── grouped_expr
                    │       ├── lparen: "("
                    │       ├── filter_expr
                    │       │   └── or_expr
                    │       │       ├── and_expr
                    │       │       │   └── filter: "game:valorant"
                    │       │       ├── "OR"
                    │       │       └── and_expr
                    │       │           └── filter: "game:csgo"
                    │       └── rparen: ")"
                    ├── whitespace
                    └── filter_term
                        └── filter: "tag:clutch"
```

### Example 5: Mixed Terms and Filters

**Query:** `epic moment game:valorant tag:clutch`

**Parse Tree:**

```
query
└── expression
    ├── term_list
    │   ├── term
    │   │   └── word: "epic"
    │   ├── whitespace
    │   └── term
    │       └── word: "moment"
    ├── whitespace
    └── filter_list
        └── filter_expr
            └── or_expr
                └── and_expr
                    ├── filter_term
                    │   └── filter: "game:valorant"
                    ├── whitespace
                    └── filter_term
                        └── filter: "tag:clutch"
```

### Example 6: Complex Query

**Query:** `"epic comeback" (game:valorant OR game:csgo) -is:nsfw votes:>=10 after:last-week sort:popular`

**Parse Tree:**

```
query
└── expression
    ├── term_list
    │   └── term
    │       └── phrase: "epic comeback"
    ├── whitespace
    └── filter_list
        └── filter_expr
            └── or_expr
                └── and_expr
                    ├── filter_term
                    │   └── grouped_expr: "(game:valorant OR game:csgo)"
                    ├── whitespace
                    ├── filter_term
                    │   └── filter: "-is:nsfw"
                    ├── whitespace
                    ├── filter_term
                    │   └── filter: "votes:>=10"
                    ├── whitespace
                    ├── filter_term
                    │   └── filter: "after:last-week"
                    ├── whitespace
                    └── filter_term
                        └── filter: "sort:popular"
```

## Validation Rules

The following validation rules apply during parsing and semantic analysis:

### Lexical Validation

1. **Quote Matching**: All opening quotes must have corresponding closing quotes
2. **Escape Sequences**: Only `\"` and `\\` are valid escape sequences
3. **Maximum Length**: Query string must not exceed 1000 characters
4. **Character Set**: All characters must be valid Unicode

### Syntactic Validation

1. **Parentheses Balance**: All opening parentheses must have matching closing parentheses
2. **Filter Structure**: All filters must have format `name:value`
3. **Whitespace**: OR operator must be surrounded by whitespace
4. **Nesting Depth**: Maximum nesting depth of 10 levels

### Semantic Validation

1. **Filter Names**: Must be one of the defined filter names (case-insensitive)
2. **Filter Values**: Must match the expected type for each filter
3. **Range Values**: Min must be less than or equal to max in intervals
4. **Date Values**: Must be valid dates (no Feb 30, etc.)
5. **Enum Values**: Must be one of the allowed values for that filter

### Constraints

| Constraint | Limit | Error Code |
|------------|-------|------------|
| Maximum query length | 1000 characters | QE007 |
| Maximum filters per query | 50 | QE008 |
| Maximum nesting depth | 10 levels | QE009 |
| Maximum OR clauses | 20 | QE011 |
| Maximum terms in term list | 100 | QE012 |

## Railroad Diagrams

### Query Structure

```
query: ─┬─ [expression] ──┤
        └─────────────────┘

expression: ─┬─ term_list ─────────────────────────────┬─
             ├─ filter_list ───────────────────────────┤
             ├─ term_list ─ whitespace ─ filter_list ──┤
             └─ filter_list ─ whitespace ─ term_list ──┘
```

### Filter Expression

```
filter: ─┬─ [negation] ─ filter_name ─ ":" ─ filter_value ──┤
         └──────────────────────────────────────────────────┘

filter_name: ─┬─ clip_filter ──────┬─
              ├─ user_filter ──────┤
              └─ universal_filter ─┘

filter_value: ─┬─ range_value ─┬─
               ├─ date_value ──┤
               ├─ flag_value ──┤
               ├─ enum_value ──┤
               └─ string_value ┘
```

### Range Value

```
range_value: ─┬─ comparison_op ─ number ─────────┬─
              └─ number ─ ".." ─ number ─────────┘

comparison_op: ─┬─ ">" ──┬─
                ├─ ">=" ─┤
                ├─ "<" ──┤
                ├─ "<=" ─┤
                └─ "=" ──┘
```

### Date Value

```
date_value: ─┬─ iso_date ──────┬─
             └─ relative_date ─┘

iso_date: ─ year ─ "-" ─ month ─ "-" ─ day ──┤

relative_date: ─┬─ "today" ─────┬─
                ├─ "yesterday" ─┤
                ├─ "last-week" ─┤
                ├─ "last-month" ┤
                └─ "last-year" ─┘
```

## Version History

### Version 1.0.0 (2025-11-09)

**Initial Release**

- Complete EBNF grammar specification
- Support for free-text search terms
- Support for field filters (game, creator, tag, etc.)
- Boolean operators (implicit AND, explicit OR)
- Grouping with parentheses
- Negation operator
- Range values with comparison operators
- Date values (ISO and relative)
- Boolean flags
- Enumeration values
- String escaping and quoting

### Future Versions

#### Version 1.1 (Planned)

- Explicit AND operator
- NOT operator (alternative to `-`)
- Field boosting (`field:value^2`)
- Fuzzy matching (`field:value~`)
- Wildcards (`field:valo*`)

#### Version 2.0 (Planned)

- Regular expressions (`field:/pattern/`)
- Proximity search (`"word1 word2"~5`)
- Range syntax sugar (`field:[min TO max]`)
- Multiple value syntax (`field:(value1|value2|value3)`)

## References

- [ISO/IEC 14977:1996 - Extended BNF](https://www.cl.cam.ac.uk/~mgk25/iso-14977.pdf)
- [W3C EBNF Notation](https://www.w3.org/TR/REC-xml/#sec-notation)
- [Lucene Query Parser Syntax](https://lucene.apache.org/core/2_9_4/queryparsersyntax.html)
- [Elasticsearch Query String Syntax](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-string-syntax)

## License

This grammar specification is part of the Clipper project and is licensed under the MIT License.

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-11-09  
**Status:** Approved  
**Maintainer:** Clipper Engineering Team
