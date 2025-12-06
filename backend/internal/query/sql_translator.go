package query

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// Common errors
var (
	ErrEmptyQuery           = errors.New("empty query")
	ErrInvalidField         = errors.New("invalid field name")
	ErrFieldNotAllowed      = errors.New("field not allowed")
	ErrUnsupportedOperator  = errors.New("unsupported operator")
	ErrInvalidValue         = errors.New("invalid value")
	ErrQueryTooComplex      = errors.New("query too complex")
	ErrUnboundedQuery       = errors.New("unbounded query: limit required")
	ErrMaxDepthExceeded     = errors.New("max query depth exceeded")
	ErrInvalidLikePattern   = errors.New("invalid LIKE pattern")
	ErrTooManyInValues      = errors.New("too many IN values")
	ErrInvalidDateFormat    = errors.New("invalid date format")
	ErrInvalidSortDirection = errors.New("invalid sort direction")
)

// SQLTranslator translates AST nodes to SQL queries
type SQLTranslator struct {
	opts          *QueryOptions
	argCounter    int
	args          []interface{}
	maxDepth      int
	currentDepth  int
	maxInValues   int
	tableAlias    string
	allowedFields map[string]bool
	fieldMapping  map[string]string
}

// NewSQLTranslator creates a new SQL translator with the given options
func NewSQLTranslator(opts *QueryOptions) *SQLTranslator {
	if opts == nil {
		opts = DefaultQueryOptions()
	}

	allowedFields := make(map[string]bool)
	for _, f := range opts.AllowedFields {
		allowedFields[f] = true
	}

	return &SQLTranslator{
		opts:          opts,
		argCounter:    0,
		args:          make([]interface{}, 0),
		maxDepth:      10,
		currentDepth:  0,
		maxInValues:   1000,
		tableAlias:    "",
		allowedFields: allowedFields,
		fieldMapping:  opts.FieldMapping,
	}
}

// SetTableAlias sets the table alias for qualified column names
func (t *SQLTranslator) SetTableAlias(alias string) {
	t.tableAlias = alias
}

// Translate converts an AST node to a SQL WHERE clause
func (t *SQLTranslator) Translate(node Node) (*QueryResult, error) {
	if node == nil {
		return nil, ErrEmptyQuery
	}

	// Reset state
	t.argCounter = 0
	t.args = make([]interface{}, 0)
	t.currentDepth = 0

	// Apply safe limits
	t.opts.ApplySafeLimit()
	t.opts.CalculateOffset()

	// Translate the node
	sql, err := t.translateNode(node)
	if err != nil {
		return &QueryResult{Errors: []error{err}}, err
	}

	result := &QueryResult{
		SQL:    sql,
		Args:   t.args,
		Limit:  t.opts.Limit,
		Offset: t.opts.Offset,
	}

	return result, nil
}

// translateNode handles translation of different node types
func (t *SQLTranslator) translateNode(node Node) (string, error) {
	t.currentDepth++
	defer func() { t.currentDepth-- }()

	if t.currentDepth > t.maxDepth {
		return "", ErrMaxDepthExceeded
	}

	switch n := node.(type) {
	case *BinaryNode:
		return t.translateBinaryNode(n)
	case *UnaryNode:
		return t.translateUnaryNode(n)
	case *FieldNode:
		return t.translateFieldNode(n)
	case *LiteralNode:
		return t.translateLiteralNode(n)
	case *ListNode:
		return t.translateListNode(n)
	case *RangeNode:
		return t.translateRangeNode(n)
	case *FullTextNode:
		return t.translateFullTextNode(n)
	case *InNode:
		return t.translateInNode(n)
	default:
		return "", fmt.Errorf("%w: %T", ErrUnsupportedOperator, node)
	}
}

// translateBinaryNode translates binary operations
func (t *SQLTranslator) translateBinaryNode(n *BinaryNode) (string, error) {
	left, err := t.translateNode(n.Left)
	if err != nil {
		return "", err
	}

	right, err := t.translateNode(n.Right)
	if err != nil {
		return "", err
	}

	switch n.Op {
	case NodeAnd:
		return fmt.Sprintf("(%s AND %s)", left, right), nil
	case NodeOr:
		return fmt.Sprintf("(%s OR %s)", left, right), nil
	case NodeEquals:
		return fmt.Sprintf("%s = %s", left, right), nil
	case NodeNotEquals:
		return fmt.Sprintf("%s != %s", left, right), nil
	case NodeGreaterThan:
		return fmt.Sprintf("%s > %s", left, right), nil
	case NodeGreaterThanOrEqual:
		return fmt.Sprintf("%s >= %s", left, right), nil
	case NodeLessThan:
		return fmt.Sprintf("%s < %s", left, right), nil
	case NodeLessThanOrEqual:
		return fmt.Sprintf("%s <= %s", left, right), nil
	case NodeLike:
		if err := t.validateLikePattern(right); err != nil {
			return "", err
		}
		return fmt.Sprintf("%s LIKE %s", left, right), nil
	case NodeILike:
		if err := t.validateLikePattern(right); err != nil {
			return "", err
		}
		return fmt.Sprintf("%s ILIKE %s", left, right), nil
	default:
		return "", fmt.Errorf("%w: %v", ErrUnsupportedOperator, n.Op)
	}
}

// translateUnaryNode translates unary operations
func (t *SQLTranslator) translateUnaryNode(n *UnaryNode) (string, error) {
	child, err := t.translateNode(n.Child)
	if err != nil {
		return "", err
	}

	switch n.Op {
	case NodeNot:
		return fmt.Sprintf("NOT (%s)", child), nil
	case NodeIsNull:
		return fmt.Sprintf("%s IS NULL", child), nil
	case NodeIsNotNull:
		return fmt.Sprintf("%s IS NOT NULL", child), nil
	case NodeExists:
		return fmt.Sprintf("EXISTS (%s)", child), nil
	default:
		return "", fmt.Errorf("%w: %v", ErrUnsupportedOperator, n.Op)
	}
}

// translateFieldNode translates field references
func (t *SQLTranslator) translateFieldNode(n *FieldNode) (string, error) {
	// Validate field name (prevent SQL injection)
	if !t.isValidFieldName(n.Name) {
		return "", fmt.Errorf("%w: %s", ErrInvalidField, n.Name)
	}

	// Check if field is allowed
	if len(t.allowedFields) > 0 && !t.allowedFields[n.Name] {
		return "", fmt.Errorf("%w: %s", ErrFieldNotAllowed, n.Name)
	}

	// Apply field mapping if exists
	fieldName := n.Name
	if mapped, ok := t.fieldMapping[n.Name]; ok {
		fieldName = mapped
	}

	// Apply table alias if set
	if t.tableAlias != "" {
		return fmt.Sprintf("%s.%s", t.tableAlias, fieldName), nil
	}

	return fieldName, nil
}

// translateLiteralNode translates literal values
func (t *SQLTranslator) translateLiteralNode(n *LiteralNode) (string, error) {
	t.argCounter++
	t.args = append(t.args, n.Value)
	return t.placeholder(), nil
}

// translateListNode translates list of values
func (t *SQLTranslator) translateListNode(n *ListNode) (string, error) {
	if len(n.Values) > t.maxInValues {
		return "", fmt.Errorf("%w: got %d, max %d", ErrTooManyInValues, len(n.Values), t.maxInValues)
	}

	placeholders := make([]string, len(n.Values))
	for i, v := range n.Values {
		t.argCounter++
		t.args = append(t.args, v)
		placeholders[i] = t.placeholderAt(t.argCounter)
	}

	return "(" + strings.Join(placeholders, ", ") + ")", nil
}

// translateRangeNode translates range (BETWEEN) queries
func (t *SQLTranslator) translateRangeNode(n *RangeNode) (string, error) {
	field, err := t.translateNode(n.Field)
	if err != nil {
		return "", err
	}

	t.argCounter++
	minPlaceholder := t.placeholder()
	t.args = append(t.args, n.Min)

	t.argCounter++
	maxPlaceholder := t.placeholder()
	t.args = append(t.args, n.Max)

	return fmt.Sprintf("%s BETWEEN %s AND %s", field, minPlaceholder, maxPlaceholder), nil
}

// translateFullTextNode translates full-text search queries for PostgreSQL
func (t *SQLTranslator) translateFullTextNode(n *FullTextNode) (string, error) {
	if n.Query == "" {
		return "", ErrEmptyQuery
	}

	// Sanitize and convert query to tsquery format
	tsQuery := t.toTSQuery(n.Query)
	t.argCounter++
	t.args = append(t.args, tsQuery)

	// Build the search vector column name(s)
	if len(n.Fields) == 0 {
		// Default to search_vector column
		return fmt.Sprintf("search_vector @@ to_tsquery('english', %s)", t.placeholder()), nil
	}

	// Multiple fields: build composite tsvector
	fieldExprs := make([]string, len(n.Fields))
	for i, field := range n.Fields {
		if !t.isValidFieldName(field) {
			return "", fmt.Errorf("%w: %s", ErrInvalidField, field)
		}
		fieldExprs[i] = fmt.Sprintf("to_tsvector('english', COALESCE(%s, ''))", field)
	}

	return fmt.Sprintf("(%s) @@ to_tsquery('english', %s)",
		strings.Join(fieldExprs, " || "),
		t.placeholderAt(t.argCounter)), nil
}

// translateInNode translates IN queries
func (t *SQLTranslator) translateInNode(n *InNode) (string, error) {
	if len(n.Values) > t.maxInValues {
		return "", fmt.Errorf("%w: got %d, max %d", ErrTooManyInValues, len(n.Values), t.maxInValues)
	}

	field, err := t.translateNode(n.Field)
	if err != nil {
		return "", err
	}

	placeholders := make([]string, len(n.Values))
	for i, v := range n.Values {
		t.argCounter++
		t.args = append(t.args, v)
		placeholders[i] = t.placeholderAt(t.argCounter)
	}

	op := "IN"
	if n.Negate {
		op = "NOT IN"
	}

	return fmt.Sprintf("%s %s (%s)", field, op, strings.Join(placeholders, ", ")), nil
}

// Helper methods

// placeholder returns the current placeholder
func (t *SQLTranslator) placeholder() string {
	return fmt.Sprintf("$%d", t.argCounter)
}

// placeholderAt returns a specific placeholder
func (t *SQLTranslator) placeholderAt(n int) string {
	return fmt.Sprintf("$%d", n)
}

// isValidFieldName validates field names to prevent SQL injection
func (t *SQLTranslator) isValidFieldName(name string) bool {
	// Allow only alphanumeric, underscores, and dots (for qualified names)
	matched, _ := regexp.MatchString(`^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$`, name)
	return matched
}

// validateLikePattern validates LIKE patterns for safety
func (t *SQLTranslator) validateLikePattern(pattern string) error {
	// Prevent patterns that could cause performance issues
	// e.g., leading wildcards without any anchoring characters
	if strings.HasPrefix(pattern, "%") && len(pattern) < 4 {
		return fmt.Errorf("%w: leading wildcard requires at least 3 characters", ErrInvalidLikePattern)
	}
	return nil
}

// toTSQuery converts a search query to PostgreSQL tsquery format
func (t *SQLTranslator) toTSQuery(query string) string {
	// Simple parsing: split by spaces and join with & (AND)
	words := strings.Fields(query)

	var cleanWords []string
	for _, word := range words {
		cleaned := strings.TrimSpace(word)
		if cleaned != "" {
			// Add prefix matching for partial words
			cleanWords = append(cleanWords, cleaned+":*")
		}
	}

	if len(cleanWords) == 0 {
		return ""
	}

	return strings.Join(cleanWords, " & ")
}

// BuildSelectQuery builds a complete SELECT query with pagination
func (t *SQLTranslator) BuildSelectQuery(tableName string, columns []string, whereNode Node, orderBy string) (*QueryResult, error) {
	// Validate inputs
	if tableName == "" {
		return nil, errors.New("table name required")
	}

	if !t.isValidFieldName(tableName) {
		return nil, fmt.Errorf("%w: %s", ErrInvalidField, tableName)
	}

	// Translate WHERE clause
	var whereClause string
	var err error
	if whereNode != nil {
		whereClause, err = t.translateNode(whereNode)
		if err != nil {
			return &QueryResult{Errors: []error{err}}, err
		}
	}

	// Build column list
	cols := "*"
	if len(columns) > 0 {
		validCols := make([]string, 0, len(columns))
		for _, col := range columns {
			if !t.isValidFieldName(col) {
				return nil, fmt.Errorf("%w: %s", ErrInvalidField, col)
			}
			validCols = append(validCols, col)
		}
		cols = strings.Join(validCols, ", ")
	}

	// Build ORDER BY clause
	orderClause := ""
	if orderBy != "" {
		if !t.isValidFieldName(orderBy) {
			return nil, fmt.Errorf("%w: %s", ErrInvalidField, orderBy)
		}
		dir := t.opts.OrderDir
		if dir != "ASC" && dir != "DESC" {
			dir = "DESC"
		}
		orderClause = fmt.Sprintf(" ORDER BY %s %s", orderBy, dir)
	}

	// Apply safe limits
	t.opts.ApplySafeLimit()
	t.opts.CalculateOffset()

	// Build query
	var sql string
	if whereClause != "" {
		sql = fmt.Sprintf("SELECT %s FROM %s WHERE %s%s LIMIT $%d OFFSET $%d",
			cols, tableName, whereClause, orderClause, t.argCounter+1, t.argCounter+2)
	} else {
		sql = fmt.Sprintf("SELECT %s FROM %s%s LIMIT $%d OFFSET $%d",
			cols, tableName, orderClause, t.argCounter+1, t.argCounter+2)
	}

	t.args = append(t.args, t.opts.Limit, t.opts.Offset)

	return &QueryResult{
		SQL:    sql,
		Args:   t.args,
		Limit:  t.opts.Limit,
		Offset: t.opts.Offset,
		Fields: columns,
	}, nil
}

// BuildCountQuery builds a COUNT query for pagination metadata
func (t *SQLTranslator) BuildCountQuery(tableName string, whereNode Node) (*QueryResult, error) {
	// Reset state for count query
	originalArgs := t.args
	originalCounter := t.argCounter
	t.args = make([]interface{}, 0)
	t.argCounter = 0

	defer func() {
		t.args = originalArgs
		t.argCounter = originalCounter
	}()

	// Validate table name
	if !t.isValidFieldName(tableName) {
		return nil, fmt.Errorf("%w: %s", ErrInvalidField, tableName)
	}

	// Translate WHERE clause
	var whereClause string
	var err error
	if whereNode != nil {
		whereClause, err = t.translateNode(whereNode)
		if err != nil {
			return &QueryResult{Errors: []error{err}}, err
		}
	}

	// Build query
	var sql string
	if whereClause != "" {
		sql = fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s", tableName, whereClause)
	} else {
		sql = fmt.Sprintf("SELECT COUNT(*) FROM %s", tableName)
	}

	return &QueryResult{
		SQL:  sql,
		Args: t.args,
	}, nil
}
