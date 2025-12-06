package query

import (
	"fmt"
)

// ESTranslator translates AST nodes to Elasticsearch/OpenSearch queries
type ESTranslator struct {
	opts          *QueryOptions
	maxDepth      int
	currentDepth  int
	maxInValues   int
	allowedFields map[string]bool
	fieldMapping  map[string]string
}

// NewESTranslator creates a new Elasticsearch translator with the given options
func NewESTranslator(opts *QueryOptions) *ESTranslator {
	if opts == nil {
		opts = DefaultQueryOptions()
	}

	allowedFields := make(map[string]bool)
	for _, f := range opts.AllowedFields {
		allowedFields[f] = true
	}

	return &ESTranslator{
		opts:          opts,
		maxDepth:      10,
		currentDepth:  0,
		maxInValues:   1000,
		allowedFields: allowedFields,
		fieldMapping:  opts.FieldMapping,
	}
}

// Translate converts an AST node to an Elasticsearch query
func (t *ESTranslator) Translate(node Node) (*QueryResult, error) {
	if node == nil {
		return nil, ErrEmptyQuery
	}

	// Reset state
	t.currentDepth = 0

	// Apply safe limits
	t.opts.ApplySafeLimit()
	t.opts.CalculateOffset()

	// Translate the node
	esQuery, err := t.translateNode(node)
	if err != nil {
		return &QueryResult{Errors: []error{err}}, err
	}

	result := &QueryResult{
		ESQuery: esQuery,
		Limit:   t.opts.Limit,
		Offset:  t.opts.Offset,
	}

	return result, nil
}

// translateNode handles translation of different node types
func (t *ESTranslator) translateNode(node Node) (map[string]interface{}, error) {
	t.currentDepth++
	defer func() { t.currentDepth-- }()

	if t.currentDepth > t.maxDepth {
		return nil, ErrMaxDepthExceeded
	}

	switch n := node.(type) {
	case *BinaryNode:
		return t.translateBinaryNode(n)
	case *UnaryNode:
		return t.translateUnaryNode(n)
	case *FieldNode:
		return nil, fmt.Errorf("field node cannot be translated directly")
	case *LiteralNode:
		return nil, fmt.Errorf("literal node cannot be translated directly")
	case *ListNode:
		return nil, fmt.Errorf("list node cannot be translated directly")
	case *RangeNode:
		return t.translateRangeNode(n)
	case *FullTextNode:
		return t.translateFullTextNode(n)
	case *InNode:
		return t.translateInNode(n)
	default:
		return nil, fmt.Errorf("%w: %T", ErrUnsupportedOperator, node)
	}
}

// translateBinaryNode translates binary operations to ES queries
func (t *ESTranslator) translateBinaryNode(n *BinaryNode) (map[string]interface{}, error) {
	switch n.Op {
	case NodeAnd:
		left, err := t.translateNode(n.Left)
		if err != nil {
			return nil, err
		}
		right, err := t.translateNode(n.Right)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"must": []interface{}{left, right},
			},
		}, nil

	case NodeOr:
		left, err := t.translateNode(n.Left)
		if err != nil {
			return nil, err
		}
		right, err := t.translateNode(n.Right)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"should":               []interface{}{left, right},
				"minimum_should_match": 1,
			},
		}, nil

	case NodeEquals:
		field, value, err := t.extractFieldAndValue(n.Left, n.Right)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"term": map[string]interface{}{
				field: value,
			},
		}, nil

	case NodeNotEquals:
		field, value, err := t.extractFieldAndValue(n.Left, n.Right)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"must_not": []interface{}{
					map[string]interface{}{
						"term": map[string]interface{}{
							field: value,
						},
					},
				},
			},
		}, nil

	case NodeGreaterThan:
		field, value, err := t.extractFieldAndValue(n.Left, n.Right)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"range": map[string]interface{}{
				field: map[string]interface{}{
					"gt": value,
				},
			},
		}, nil

	case NodeGreaterThanOrEqual:
		field, value, err := t.extractFieldAndValue(n.Left, n.Right)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"range": map[string]interface{}{
				field: map[string]interface{}{
					"gte": value,
				},
			},
		}, nil

	case NodeLessThan:
		field, value, err := t.extractFieldAndValue(n.Left, n.Right)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"range": map[string]interface{}{
				field: map[string]interface{}{
					"lt": value,
				},
			},
		}, nil

	case NodeLessThanOrEqual:
		field, value, err := t.extractFieldAndValue(n.Left, n.Right)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"range": map[string]interface{}{
				field: map[string]interface{}{
					"lte": value,
				},
			},
		}, nil

	case NodeLike, NodeILike:
		field, value, err := t.extractFieldAndValue(n.Left, n.Right)
		if err != nil {
			return nil, err
		}
		// Convert SQL LIKE pattern to ES wildcard pattern
		pattern := t.likeToWildcard(fmt.Sprintf("%v", value))
		return map[string]interface{}{
			"wildcard": map[string]interface{}{
				field: map[string]interface{}{
					"value":            pattern,
					"case_insensitive": n.Op == NodeILike,
				},
			},
		}, nil

	default:
		return nil, fmt.Errorf("%w: %v", ErrUnsupportedOperator, n.Op)
	}
}

// translateUnaryNode translates unary operations to ES queries
func (t *ESTranslator) translateUnaryNode(n *UnaryNode) (map[string]interface{}, error) {
	switch n.Op {
	case NodeNot:
		child, err := t.translateNode(n.Child)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"must_not": []interface{}{child},
			},
		}, nil

	case NodeIsNull:
		fieldNode, ok := n.Child.(*FieldNode)
		if !ok {
			return nil, fmt.Errorf("IS NULL requires a field node")
		}
		field, err := t.getFieldName(fieldNode)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"must_not": []interface{}{
					map[string]interface{}{
						"exists": map[string]interface{}{
							"field": field,
						},
					},
				},
			},
		}, nil

	case NodeIsNotNull:
		fieldNode, ok := n.Child.(*FieldNode)
		if !ok {
			return nil, fmt.Errorf("IS NOT NULL requires a field node")
		}
		field, err := t.getFieldName(fieldNode)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"exists": map[string]interface{}{
				"field": field,
			},
		}, nil

	case NodeExists:
		fieldNode, ok := n.Child.(*FieldNode)
		if !ok {
			return nil, fmt.Errorf("EXISTS requires a field node")
		}
		field, err := t.getFieldName(fieldNode)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"exists": map[string]interface{}{
				"field": field,
			},
		}, nil

	default:
		return nil, fmt.Errorf("%w: %v", ErrUnsupportedOperator, n.Op)
	}
}

// translateRangeNode translates range (BETWEEN) queries
func (t *ESTranslator) translateRangeNode(n *RangeNode) (map[string]interface{}, error) {
	fieldNode, ok := n.Field.(*FieldNode)
	if !ok {
		return nil, fmt.Errorf("BETWEEN requires a field node")
	}

	field, err := t.getFieldName(fieldNode)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"range": map[string]interface{}{
			field: map[string]interface{}{
				"gte": n.Min,
				"lte": n.Max,
			},
		},
	}, nil
}

// translateFullTextNode translates full-text search queries
func (t *ESTranslator) translateFullTextNode(n *FullTextNode) (map[string]interface{}, error) {
	if n.Query == "" {
		return nil, ErrEmptyQuery
	}

	if len(n.Fields) == 0 {
		// Single-field match_all query
		query := map[string]interface{}{
			"match": map[string]interface{}{
				"_all": map[string]interface{}{
					"query":     n.Query,
					"fuzziness": "AUTO",
				},
			},
		}
		if n.Boost > 0 {
			query["match"].(map[string]interface{})["_all"].(map[string]interface{})["boost"] = n.Boost
		}
		return query, nil
	}

	if len(n.Fields) == 1 {
		// Single-field match query
		field, err := t.validateAndMapField(n.Fields[0])
		if err != nil {
			return nil, err
		}
		query := map[string]interface{}{
			"match": map[string]interface{}{
				field: map[string]interface{}{
					"query":     n.Query,
					"fuzziness": "AUTO",
				},
			},
		}
		if n.Boost > 0 {
			query["match"].(map[string]interface{})[field].(map[string]interface{})["boost"] = n.Boost
		}
		return query, nil
	}

	// Multi-field query
	fields := make([]string, len(n.Fields))
	for i, f := range n.Fields {
		field, err := t.validateAndMapField(f)
		if err != nil {
			return nil, err
		}
		fields[i] = field
	}

	return map[string]interface{}{
		"multi_match": map[string]interface{}{
			"query":     n.Query,
			"fields":    fields,
			"fuzziness": "AUTO",
			"operator":  "and",
		},
	}, nil
}

// translateInNode translates IN queries
func (t *ESTranslator) translateInNode(n *InNode) (map[string]interface{}, error) {
	if len(n.Values) > t.maxInValues {
		return nil, fmt.Errorf("%w: got %d, max %d", ErrTooManyInValues, len(n.Values), t.maxInValues)
	}

	fieldNode, ok := n.Field.(*FieldNode)
	if !ok {
		return nil, fmt.Errorf("IN requires a field node")
	}

	field, err := t.getFieldName(fieldNode)
	if err != nil {
		return nil, err
	}

	query := map[string]interface{}{
		"terms": map[string]interface{}{
			field: n.Values,
		},
	}

	if n.Negate {
		return map[string]interface{}{
			"bool": map[string]interface{}{
				"must_not": []interface{}{query},
			},
		}, nil
	}

	return query, nil
}

// Helper methods

// extractFieldAndValue extracts field name and value from binary operation nodes
func (t *ESTranslator) extractFieldAndValue(left, right Node) (string, interface{}, error) {
	var fieldNode *FieldNode
	var valueNode *LiteralNode

	// Try left as field, right as value
	if fn, ok := left.(*FieldNode); ok {
		fieldNode = fn
	}
	if ln, ok := right.(*LiteralNode); ok {
		valueNode = ln
	}

	// Try right as field, left as value
	if fieldNode == nil {
		if fn, ok := right.(*FieldNode); ok {
			fieldNode = fn
		}
	}
	if valueNode == nil {
		if ln, ok := left.(*LiteralNode); ok {
			valueNode = ln
		}
	}

	if fieldNode == nil {
		return "", nil, fmt.Errorf("comparison requires a field node")
	}
	if valueNode == nil {
		return "", nil, fmt.Errorf("comparison requires a value node")
	}

	field, err := t.getFieldName(fieldNode)
	if err != nil {
		return "", nil, err
	}

	return field, valueNode.Value, nil
}

// getFieldName validates and returns the field name
func (t *ESTranslator) getFieldName(n *FieldNode) (string, error) {
	return t.validateAndMapField(n.Name)
}

// validateAndMapField validates field name and applies mapping
func (t *ESTranslator) validateAndMapField(name string) (string, error) {
	// Check if field is allowed
	if len(t.allowedFields) > 0 && !t.allowedFields[name] {
		return "", fmt.Errorf("%w: %s", ErrFieldNotAllowed, name)
	}

	// Apply field mapping if exists
	if mapped, ok := t.fieldMapping[name]; ok {
		return mapped, nil
	}

	return name, nil
}

// likeToWildcard converts SQL LIKE pattern to Elasticsearch wildcard pattern
func (t *ESTranslator) likeToWildcard(pattern string) string {
	// Convert % to * and _ to ?
	result := pattern
	result = replaceUnescaped(result, "%", "*")
	result = replaceUnescaped(result, "_", "?")
	return result
}

// replaceUnescaped replaces unescaped occurrences of a pattern
func replaceUnescaped(s, old, new string) string {
	result := ""
	for i := 0; i < len(s); i++ {
		if i > 0 && s[i-1] == '\\' {
			result += string(s[i])
			continue
		}
		if string(s[i]) == old {
			result += new
		} else {
			result += string(s[i])
		}
	}
	return result
}

// BuildSearchQuery builds a complete Elasticsearch search query with pagination
func (t *ESTranslator) BuildSearchQuery(node Node, sortField string, sortDir string) (*QueryResult, error) {
	// Translate the query
	queryClause, err := t.translateNode(node)
	if err != nil {
		return nil, err
	}

	// Apply safe limits
	t.opts.ApplySafeLimit()
	t.opts.CalculateOffset()

	// Build sort clause
	sort := []map[string]interface{}{}
	if sortField != "" {
		order := "desc"
		if sortDir == "ASC" || sortDir == "asc" {
			order = "asc"
		}
		sort = append(sort, map[string]interface{}{
			sortField: order,
		})
	}

	// Build final query
	esQuery := map[string]interface{}{
		"query": queryClause,
		"from":  t.opts.Offset,
		"size":  t.opts.Limit,
	}

	if len(sort) > 0 {
		esQuery["sort"] = sort
	}

	return &QueryResult{
		ESQuery: esQuery,
		Limit:   t.opts.Limit,
		Offset:  t.opts.Offset,
	}, nil
}

// BuildMatchAllQuery builds a match_all query with pagination
func (t *ESTranslator) BuildMatchAllQuery(filters []Node, sortField string, sortDir string) (*QueryResult, error) {
	// Apply safe limits
	t.opts.ApplySafeLimit()
	t.opts.CalculateOffset()

	var query map[string]interface{}

	if len(filters) == 0 {
		query = map[string]interface{}{
			"match_all": map[string]interface{}{},
		}
	} else {
		// Combine filters with bool/filter
		filterClauses := make([]interface{}, 0, len(filters))
		for _, f := range filters {
			fc, err := t.translateNode(f)
			if err != nil {
				return nil, err
			}
			filterClauses = append(filterClauses, fc)
		}

		query = map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": filterClauses,
			},
		}
	}

	// Build sort clause
	sort := []map[string]interface{}{}
	if sortField != "" {
		order := "desc"
		if sortDir == "ASC" || sortDir == "asc" {
			order = "asc"
		}
		sort = append(sort, map[string]interface{}{
			sortField: order,
		})
	}

	// Build final query
	esQuery := map[string]interface{}{
		"query": query,
		"from":  t.opts.Offset,
		"size":  t.opts.Limit,
	}

	if len(sort) > 0 {
		esQuery["sort"] = sort
	}

	return &QueryResult{
		ESQuery: esQuery,
		Limit:   t.opts.Limit,
		Offset:  t.opts.Offset,
	}, nil
}
