/**
 * Abstract Syntax Tree (AST) types for the Clipper Query Language
 * Based on RFC 002: Advanced Query Language
 */

/**
 * Position information for error reporting
 */
export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

/**
 * Base AST Node
 */
export interface ASTNode {
  type: string;
  loc?: SourceLocation;
}

/**
 * Root query node
 */
export interface QueryNode extends ASTNode {
  type: 'Query';
  terms: TermNode[];
  filters: FilterExprNode[];
}

/**
 * Free-text search term
 */
export interface TermNode extends ASTNode {
  type: 'Term';
  value: string;
  negated: boolean;
}

/**
 * Filter expression (can be a single filter, grouped, or boolean expression)
 */
export type FilterExprNode = FilterNode | GroupedFilterNode | BooleanExprNode;

/**
 * Single filter (e.g., game:valorant)
 */
export interface FilterNode extends ASTNode {
  type: 'Filter';
  name: FilterName;
  value: FilterValue;
  negated: boolean;
}

/**
 * Grouped filters (e.g., (game:valorant OR game:csgo))
 */
export interface GroupedFilterNode extends ASTNode {
  type: 'GroupedFilter';
  filters: FilterExprNode[];
}

/**
 * Boolean expression with OR operator
 */
export interface BooleanExprNode extends ASTNode {
  type: 'BooleanExpr';
  operator: 'OR';
  left: FilterExprNode;
  right: FilterExprNode;
}

/**
 * Filter names as defined in RFC 002
 */
export type FilterName =
  // Clip filters
  | 'game'
  | 'creator'
  | 'broadcaster'
  | 'tag'
  | 'language'
  | 'duration'
  | 'views'
  | 'votes'
  | 'after'
  | 'before'
  | 'is'
  | 'sort'
  // User filters
  | 'karma'
  | 'role'
  // Universal filters
  | 'type';

/**
 * Filter value types
 */
export type FilterValue =
  | RangeValue
  | DateValue
  | FlagValue
  | StringValue;

/**
 * Range value (e.g., >10, 10..100)
 */
export interface RangeValue extends ASTNode {
  type: 'RangeValue';
  operator?: ComparisonOperator;
  min?: number;
  max?: number;
}

export type ComparisonOperator = '>' | '>=' | '<' | '<=' | '=';

/**
 * Date value (ISO date or relative)
 */
export interface DateValue extends ASTNode {
  type: 'DateValue';
  date: string; // ISO date or relative date keyword
  isRelative: boolean;
}

/**
 * Boolean flag value (for is: filter)
 */
export interface FlagValue extends ASTNode {
  type: 'FlagValue';
  flag: 'featured' | 'nsfw';
}

/**
 * String value
 */
export interface StringValue extends ASTNode {
  type: 'StringValue';
  value: string;
  quoted: boolean;
}

/**
 * Valid relative date keywords
 */
export const RELATIVE_DATES = [
  'today',
  'yesterday',
  'last-week',
  'last-month',
  'last-year',
] as const;

export type RelativeDate = typeof RELATIVE_DATES[number];

/**
 * Valid sort orders
 */
export const SORT_ORDERS = ['relevance', 'recent', 'popular'] as const;
export type SortOrder = typeof SORT_ORDERS[number];

/**
 * Valid result types
 */
export const RESULT_TYPES = ['clips', 'creators', 'games', 'tags', 'all'] as const;
export type ResultType = typeof RESULT_TYPES[number];

/**
 * Valid language codes (ISO 639-1)
 */
export const LANGUAGE_CODES = ['en', 'es', 'fr', 'de', 'pt', 'ru', 'ja', 'ko', 'zh'] as const;
export type LanguageCode = typeof LANGUAGE_CODES[number];

/**
 * Valid boolean flags
 */
export const FLAGS = ['featured', 'nsfw'] as const;
export type Flag = typeof FLAGS[number];

/**
 * Valid user roles
 */
export const USER_ROLES = ['user', 'moderator', 'admin'] as const;
export type UserRole = typeof USER_ROLES[number];

/**
 * Type guard to check if a string is a valid filter name
 */
export function isValidFilterName(name: string): name is FilterName {
  const validNames: FilterName[] = [
    'game', 'creator', 'broadcaster', 'tag', 'language',
    'duration', 'views', 'votes', 'after', 'before',
    'is', 'sort', 'karma', 'role', 'type'
  ];
  return validNames.includes(name as FilterName);
}

/**
 * Type guard to check if a string is a valid comparison operator
 */
export function isValidComparisonOperator(op: string): op is ComparisonOperator {
  return ['>', '>=', '<', '<=', '='].includes(op);
}

/**
 * Type guard to check if a string is a valid relative date
 */
export function isValidRelativeDate(date: string): date is RelativeDate {
  return RELATIVE_DATES.includes(date as RelativeDate);
}
