package query

import (
	"fmt"
	"regexp"
	"strings"
)

// ValidationError represents a validation error with context
type ValidationError struct {
	Field   string
	Message string
	Code    string
}

// Error implements the error interface
func (e *ValidationError) Error() string {
	if e.Field != "" {
		return fmt.Sprintf("%s: %s", e.Field, e.Message)
	}
	return e.Message
}

// Validator validates query AST nodes
type Validator struct {
	allowedFields    map[string]bool
	disallowedFields map[string]bool
	maxDepth         int
	maxInValues      int
	maxStringLength  int
	allowWildcards   bool
	errors           []ValidationError
}

// ValidatorConfig holds configuration for the validator
type ValidatorConfig struct {
	AllowedFields    []string
	DisallowedFields []string
	MaxDepth         int
	MaxInValues      int
	MaxStringLength  int
	AllowWildcards   bool
}

// DefaultValidatorConfig returns default validator configuration
func DefaultValidatorConfig() *ValidatorConfig {
	return &ValidatorConfig{
		MaxDepth:        10,
		MaxInValues:     1000,
		MaxStringLength: 1000,
		AllowWildcards:  true,
	}
}

// NewValidator creates a new validator with the given configuration
func NewValidator(config *ValidatorConfig) *Validator {
	if config == nil {
		config = DefaultValidatorConfig()
	}

	allowedFields := make(map[string]bool)
	for _, f := range config.AllowedFields {
		allowedFields[f] = true
	}

	disallowedFields := make(map[string]bool)
	for _, f := range config.DisallowedFields {
		disallowedFields[f] = true
	}

	return &Validator{
		allowedFields:    allowedFields,
		disallowedFields: disallowedFields,
		maxDepth:         config.MaxDepth,
		maxInValues:      config.MaxInValues,
		maxStringLength:  config.MaxStringLength,
		allowWildcards:   config.AllowWildcards,
		errors:           make([]ValidationError, 0),
	}
}

// Validate validates an AST node and returns validation errors
func (v *Validator) Validate(node Node) []ValidationError {
	v.errors = make([]ValidationError, 0)
	v.validateNode(node, 0)
	return v.errors
}

// IsValid returns true if the node is valid
func (v *Validator) IsValid(node Node) bool {
	errors := v.Validate(node)
	return len(errors) == 0
}

// validateNode recursively validates a node
func (v *Validator) validateNode(node Node, depth int) {
	if node == nil {
		return
	}

	// Check depth
	if depth > v.maxDepth {
		v.addError("", "Query exceeds maximum depth", "MAX_DEPTH_EXCEEDED")
		return
	}

	switch n := node.(type) {
	case *BinaryNode:
		v.validateBinaryNode(n, depth)
	case *UnaryNode:
		v.validateUnaryNode(n, depth)
	case *FieldNode:
		v.validateFieldNode(n)
	case *LiteralNode:
		v.validateLiteralNode(n)
	case *ListNode:
		v.validateListNode(n)
	case *RangeNode:
		v.validateRangeNode(n, depth)
	case *FullTextNode:
		v.validateFullTextNode(n)
	case *InNode:
		v.validateInNode(n, depth)
	}
}

// validateBinaryNode validates binary operation nodes
func (v *Validator) validateBinaryNode(n *BinaryNode, depth int) {
	v.validateNode(n.Left, depth+1)
	v.validateNode(n.Right, depth+1)
}

// validateUnaryNode validates unary operation nodes
func (v *Validator) validateUnaryNode(n *UnaryNode, depth int) {
	v.validateNode(n.Child, depth+1)
}

// validateFieldNode validates field references
func (v *Validator) validateFieldNode(n *FieldNode) {
	// Check field name format
	if !v.isValidFieldName(n.Name) {
		v.addError(n.Name, "Invalid field name format", "INVALID_FIELD_NAME")
		return
	}

	// Check if field is disallowed
	if v.disallowedFields[n.Name] {
		v.addError(n.Name, "Field is not allowed in queries", "DISALLOWED_FIELD")
		return
	}

	// Check if field is in allowed list (if list is configured)
	if len(v.allowedFields) > 0 && !v.allowedFields[n.Name] {
		v.addError(n.Name, "Field is not in allowed list", "FIELD_NOT_ALLOWED")
		return
	}
}

// validateLiteralNode validates literal values
func (v *Validator) validateLiteralNode(n *LiteralNode) {
	// Check string length
	if str, ok := n.Value.(string); ok {
		if len(str) > v.maxStringLength {
			v.addError("", fmt.Sprintf("String value exceeds maximum length of %d", v.maxStringLength), "STRING_TOO_LONG")
		}

		// Check for SQL injection patterns
		if v.containsSQLInjection(str) {
			v.addError("", "Value contains potentially dangerous SQL patterns", "SQL_INJECTION_DETECTED")
		}
	}
}

// validateListNode validates list nodes
func (v *Validator) validateListNode(n *ListNode) {
	if len(n.Values) > v.maxInValues {
		v.addError("", fmt.Sprintf("List exceeds maximum of %d values", v.maxInValues), "TOO_MANY_VALUES")
	}

	// Validate each value
	for _, val := range n.Values {
		if str, ok := val.(string); ok {
			if len(str) > v.maxStringLength {
				v.addError("", "List contains string value that exceeds maximum length", "STRING_TOO_LONG")
			}
		}
	}
}

// validateRangeNode validates range nodes
func (v *Validator) validateRangeNode(n *RangeNode, depth int) {
	v.validateNode(n.Field, depth+1)

	// Validate range values
	v.validateRangeValue(n.Min, "min")
	v.validateRangeValue(n.Max, "max")
}

// validateRangeValue validates a range boundary value
// boundaryType indicates which boundary is being validated (e.g., "min" or "max")
func (v *Validator) validateRangeValue(val interface{}, boundaryType string) {
	if val == nil {
		v.addError(boundaryType, "Range value cannot be nil", "NIL_RANGE_VALUE")
		return
	}

	if str, ok := val.(string); ok {
		if len(str) > v.maxStringLength {
			v.addError(boundaryType, "Range value exceeds maximum string length", "STRING_TOO_LONG")
		}
	}
}

// validateFullTextNode validates full-text search nodes
func (v *Validator) validateFullTextNode(n *FullTextNode) {
	if n.Query == "" {
		v.addError("query", "Full-text search query cannot be empty", "EMPTY_QUERY")
		return
	}

	if len(n.Query) > v.maxStringLength {
		v.addError("query", "Full-text search query exceeds maximum length", "QUERY_TOO_LONG")
	}

	// Check for wildcards if not allowed
	if !v.allowWildcards {
		if strings.Contains(n.Query, "*") || strings.Contains(n.Query, "?") {
			v.addError("query", "Wildcards are not allowed in full-text search", "WILDCARDS_NOT_ALLOWED")
		}
	}

	// Validate fields
	for _, field := range n.Fields {
		if !v.isValidFieldName(field) {
			v.addError(field, "Invalid field name in full-text search", "INVALID_FIELD_NAME")
		}
	}
}

// validateInNode validates IN clause nodes
func (v *Validator) validateInNode(n *InNode, depth int) {
	v.validateNode(n.Field, depth+1)

	if len(n.Values) > v.maxInValues {
		v.addError("", fmt.Sprintf("IN clause exceeds maximum of %d values", v.maxInValues), "TOO_MANY_IN_VALUES")
	}

	// Validate each value
	for _, val := range n.Values {
		if str, ok := val.(string); ok {
			if len(str) > v.maxStringLength {
				v.addError("", "IN clause contains string value that exceeds maximum length", "STRING_TOO_LONG")
			}
		}
	}
}

// Helper methods

// isValidFieldName checks if a field name is valid
func (v *Validator) isValidFieldName(name string) bool {
	if name == "" {
		return false
	}
	matched, _ := regexp.MatchString(`^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$`, name)
	return matched
}

// containsSQLInjection checks for common SQL injection patterns
func (v *Validator) containsSQLInjection(str string) bool {
	// Common SQL injection patterns
	patterns := []string{
		`(?i);\s*drop\s+`,
		`(?i);\s*delete\s+`,
		`(?i);\s*insert\s+`,
		`(?i);\s*update\s+`,
		`(?i);\s*alter\s+`,
		`(?i);\s*truncate\s+`,
		`(?i)union\s+select`,
		`(?i)--`,
		`(?i)/\*.*\*/`,
	}

	for _, pattern := range patterns {
		matched, _ := regexp.MatchString(pattern, str)
		if matched {
			return true
		}
	}

	return false
}

// addError adds a validation error
func (v *Validator) addError(field, message, code string) {
	v.errors = append(v.errors, ValidationError{
		Field:   field,
		Message: message,
		Code:    code,
	})
}

// SafeQueryLimits defines safety limits for queries
type SafeQueryLimits struct {
	MaxLimit        int
	DefaultLimit    int
	MaxOffset       int
	MaxDepth        int
	MaxInValues     int
	MaxStringLength int
	TimeoutSeconds  int
}

// DefaultSafeQueryLimits returns default safe query limits
func DefaultSafeQueryLimits() *SafeQueryLimits {
	return &SafeQueryLimits{
		MaxLimit:        100,
		DefaultLimit:    20,
		MaxOffset:       10000,
		MaxDepth:        10,
		MaxInValues:     1000,
		MaxStringLength: 1000,
		TimeoutSeconds:  30,
	}
}

// ApplyLimits applies safety limits to query options
func (l *SafeQueryLimits) ApplyLimits(opts *QueryOptions) {
	if opts == nil {
		return
	}

	// Apply limit constraints
	if opts.Limit <= 0 {
		opts.Limit = l.DefaultLimit
	}
	if opts.Limit > l.MaxLimit {
		opts.Limit = l.MaxLimit
	}

	// Apply offset constraints
	if opts.Offset < 0 {
		opts.Offset = 0
	}
	if opts.Offset > l.MaxOffset {
		opts.Offset = l.MaxOffset
	}

	// Set max values in options
	opts.MaxLimit = l.MaxLimit
	opts.DefaultLimit = l.DefaultLimit
}

// ValidateQueryOptions validates query options and returns errors
func (l *SafeQueryLimits) ValidateQueryOptions(opts *QueryOptions) []ValidationError {
	var errors []ValidationError

	if opts.Limit <= 0 {
		// This will be fixed by ApplyLimits, so it's a warning not an error
	}

	if opts.Offset < 0 {
		errors = append(errors, ValidationError{
			Field:   "offset",
			Message: "Offset cannot be negative",
			Code:    "NEGATIVE_OFFSET",
		})
	}

	if opts.Page < 0 {
		errors = append(errors, ValidationError{
			Field:   "page",
			Message: "Page cannot be negative",
			Code:    "NEGATIVE_PAGE",
		})
	}

	// Validate sort direction
	if opts.OrderDir != "" && opts.OrderDir != "ASC" && opts.OrderDir != "DESC" {
		errors = append(errors, ValidationError{
			Field:   "order_dir",
			Message: "Sort direction must be ASC or DESC",
			Code:    "INVALID_SORT_DIRECTION",
		})
	}

	return errors
}
