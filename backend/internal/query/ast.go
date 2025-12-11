// Package query provides an advanced query translator for converting
// abstract syntax trees (AST) into SQL and Elasticsearch queries.
// It includes safety checks, pagination, and query validation.
package query

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// NodeType represents the type of an AST node
type NodeType int

const (
	// Logical operators
	NodeAnd NodeType = iota
	NodeOr
	NodeNot

	// Comparison operators
	NodeEquals
	NodeNotEquals
	NodeGreaterThan
	NodeGreaterThanOrEqual
	NodeLessThan
	NodeLessThanOrEqual
	NodeLike
	NodeILike
	NodeIn
	NodeNotIn
	NodeBetween
	NodeIsNull
	NodeIsNotNull

	// Full-text search
	NodeFullText
	NodeMatch
	NodeMultiMatch

	// Special operators
	NodeExists
	NodeRange
	NodeTerm
	NodeTerms
	NodePrefix
	NodeWildcard

	// Value types
	NodeField
	NodeLiteral
	NodeList
)

// String returns a string representation of the NodeType
func (n NodeType) String() string {
	names := []string{
		"AND", "OR", "NOT",
		"=", "!=", ">", ">=", "<", "<=", "LIKE", "ILIKE", "IN", "NOT IN", "BETWEEN", "IS NULL", "IS NOT NULL",
		"FULLTEXT", "MATCH", "MULTI_MATCH",
		"EXISTS", "RANGE", "TERM", "TERMS", "PREFIX", "WILDCARD",
		"FIELD", "LITERAL", "LIST",
	}
	if int(n) < len(names) {
		return names[n]
	}
	return fmt.Sprintf("UNKNOWN(%d)", n)
}

// Node represents a node in the AST
type Node interface {
	Type() NodeType
	String() string
}

// BinaryNode represents a binary operation (AND, OR, comparison operators)
type BinaryNode struct {
	Op    NodeType
	Left  Node
	Right Node
}

// Type returns the node type
func (n *BinaryNode) Type() NodeType { return n.Op }

// String returns a string representation
func (n *BinaryNode) String() string {
	return fmt.Sprintf("(%s %s %s)", n.Left.String(), n.Op.String(), n.Right.String())
}

// UnaryNode represents a unary operation (NOT, IS NULL, EXISTS)
type UnaryNode struct {
	Op    NodeType
	Child Node
}

// Type returns the node type
func (n *UnaryNode) Type() NodeType { return n.Op }

// String returns a string representation
func (n *UnaryNode) String() string {
	return fmt.Sprintf("(%s %s)", n.Op.String(), n.Child.String())
}

// FieldNode represents a field reference
type FieldNode struct {
	Name string
}

// Type returns the node type
func (n *FieldNode) Type() NodeType { return NodeField }

// String returns a string representation
func (n *FieldNode) String() string { return n.Name }

// LiteralNode represents a literal value
type LiteralNode struct {
	Value interface{}
}

// Type returns the node type
func (n *LiteralNode) Type() NodeType { return NodeLiteral }

// String returns a string representation
func (n *LiteralNode) String() string { return fmt.Sprintf("%v", n.Value) }

// ListNode represents a list of values
type ListNode struct {
	Values []interface{}
}

// Type returns the node type
func (n *ListNode) Type() NodeType { return NodeList }

// String returns a string representation
func (n *ListNode) String() string {
	strs := make([]string, len(n.Values))
	for i, v := range n.Values {
		strs[i] = fmt.Sprintf("%v", v)
	}
	return "[" + strings.Join(strs, ", ") + "]"
}

// RangeNode represents a range query (BETWEEN)
type RangeNode struct {
	Field Node
	Min   interface{}
	Max   interface{}
}

// Type returns the node type
func (n *RangeNode) Type() NodeType { return NodeRange }

// String returns a string representation
func (n *RangeNode) String() string {
	return fmt.Sprintf("(%s BETWEEN %v AND %v)", n.Field.String(), n.Min, n.Max)
}

// FullTextNode represents a full-text search query
type FullTextNode struct {
	Query  string
	Fields []string
	Boost  float64
}

// Type returns the node type
func (n *FullTextNode) Type() NodeType { return NodeFullText }

// String returns a string representation
func (n *FullTextNode) String() string {
	return fmt.Sprintf("FULLTEXT(%q, fields=%v)", n.Query, n.Fields)
}

// InNode represents an IN query
type InNode struct {
	Field  Node
	Values []interface{}
	Negate bool
}

// Type returns the node type
func (n *InNode) Type() NodeType {
	if n.Negate {
		return NodeNotIn
	}
	return NodeIn
}

// String returns a string representation
func (n *InNode) String() string {
	op := "IN"
	if n.Negate {
		op = "NOT IN"
	}
	strs := make([]string, len(n.Values))
	for i, v := range n.Values {
		strs[i] = fmt.Sprintf("%v", v)
	}
	return fmt.Sprintf("(%s %s [%s])", n.Field.String(), op, strings.Join(strs, ", "))
}

// QueryOptions contains options for query translation
type QueryOptions struct {
	// Pagination
	Limit  int
	Offset int
	Page   int

	// Sorting
	OrderBy   string
	OrderDir  string // "ASC" or "DESC"
	SortField string

	// Safety limits
	MaxLimit     int
	DefaultLimit int

	// Context
	UserID    *uuid.UUID
	RequestID string
	Timeout   time.Duration

	// Field mapping
	FieldMapping map[string]string

	// Allowed fields (for security)
	AllowedFields []string
}

// DefaultQueryOptions returns default query options with safe limits
func DefaultQueryOptions() *QueryOptions {
	return &QueryOptions{
		Limit:        20,
		Offset:       0,
		Page:         1,
		MaxLimit:     100,
		DefaultLimit: 20,
		OrderDir:     "DESC",
		Timeout:      30 * time.Second,
		FieldMapping: make(map[string]string),
	}
}

// ApplySafeLimit ensures the limit is within safe bounds
func (o *QueryOptions) ApplySafeLimit() {
	if o.Limit <= 0 {
		o.Limit = o.DefaultLimit
	}
	if o.Limit > o.MaxLimit {
		o.Limit = o.MaxLimit
	}
}

// CalculateOffset calculates offset from page number
func (o *QueryOptions) CalculateOffset() {
	if o.Page > 0 {
		o.Offset = (o.Page - 1) * o.Limit
	}
}

// QueryResult represents the result of a translated query
type QueryResult struct {
	// SQL query (for PostgreSQL)
	SQL  string
	Args []interface{}

	// Elasticsearch query (as JSON-compatible map)
	ESQuery map[string]interface{}

	// Metadata
	Limit  int
	Offset int
	Fields []string

	// Errors encountered during translation
	Errors []error
}

// HasErrors returns true if the query result contains errors
func (r *QueryResult) HasErrors() bool {
	return len(r.Errors) > 0
}

// AddError adds an error to the result
func (r *QueryResult) AddError(err error) {
	r.Errors = append(r.Errors, err)
}
