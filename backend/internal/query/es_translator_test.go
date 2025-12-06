package query

import (
	"encoding/json"
	"testing"
)

func TestESTranslator_SimpleEquality(t *testing.T) {
	opts := DefaultQueryOptions()
	translator := NewESTranslator(opts)

	node := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status"},
		Right: &LiteralNode{Value: "active"},
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify the query structure
	query, ok := result.ESQuery["term"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected term query, got %v", result.ESQuery)
	}

	if query["status"] != "active" {
		t.Errorf("expected status='active', got %v", query["status"])
	}
}

func TestESTranslator_ComparisonOperators(t *testing.T) {
	tests := []struct {
		name        string
		op          NodeType
		rangeField  string
		expectRange bool
	}{
		{"greater than", NodeGreaterThan, "gt", true},
		{"greater than or equal", NodeGreaterThanOrEqual, "gte", true},
		{"less than", NodeLessThan, "lt", true},
		{"less than or equal", NodeLessThanOrEqual, "lte", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			translator := NewESTranslator(DefaultQueryOptions())
			node := &BinaryNode{
				Op:    tt.op,
				Left:  &FieldNode{Name: "score"},
				Right: &LiteralNode{Value: 100},
			}

			result, err := translator.Translate(node)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			// Verify range query structure
			rangeQuery, ok := result.ESQuery["range"].(map[string]interface{})
			if !ok {
				t.Fatalf("expected range query, got %v", result.ESQuery)
			}

			scoreRange, ok := rangeQuery["score"].(map[string]interface{})
			if !ok {
				t.Fatalf("expected score range, got %v", rangeQuery)
			}

			if _, exists := scoreRange[tt.rangeField]; !exists {
				t.Errorf("expected %s in range query, got %v", tt.rangeField, scoreRange)
			}
		})
	}
}

func TestESTranslator_LogicalOperators(t *testing.T) {
	// AND
	translator := NewESTranslator(DefaultQueryOptions())
	andNode := &BinaryNode{
		Op: NodeAnd,
		Left: &BinaryNode{
			Op:    NodeEquals,
			Left:  &FieldNode{Name: "status"},
			Right: &LiteralNode{Value: "active"},
		},
		Right: &BinaryNode{
			Op:    NodeGreaterThan,
			Left:  &FieldNode{Name: "score"},
			Right: &LiteralNode{Value: 50},
		},
	}

	result, err := translator.Translate(andNode)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify bool query with must
	boolQuery, ok := result.ESQuery["bool"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected bool query, got %v", result.ESQuery)
	}

	must, ok := boolQuery["must"].([]interface{})
	if !ok {
		t.Fatalf("expected must array, got %v", boolQuery)
	}

	if len(must) != 2 {
		t.Errorf("expected 2 must clauses, got %d", len(must))
	}

	// OR
	translator = NewESTranslator(DefaultQueryOptions())
	orNode := &BinaryNode{
		Op: NodeOr,
		Left: &BinaryNode{
			Op:    NodeEquals,
			Left:  &FieldNode{Name: "status"},
			Right: &LiteralNode{Value: "active"},
		},
		Right: &BinaryNode{
			Op:    NodeEquals,
			Left:  &FieldNode{Name: "status"},
			Right: &LiteralNode{Value: "pending"},
		},
	}

	result, err = translator.Translate(orNode)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify bool query with should
	boolQuery, ok = result.ESQuery["bool"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected bool query, got %v", result.ESQuery)
	}

	should, ok := boolQuery["should"].([]interface{})
	if !ok {
		t.Fatalf("expected should array, got %v", boolQuery)
	}

	if len(should) != 2 {
		t.Errorf("expected 2 should clauses, got %d", len(should))
	}
}

func TestESTranslator_NotOperator(t *testing.T) {
	translator := NewESTranslator(DefaultQueryOptions())
	notNode := &UnaryNode{
		Op: NodeNot,
		Child: &BinaryNode{
			Op:    NodeEquals,
			Left:  &FieldNode{Name: "status"},
			Right: &LiteralNode{Value: "deleted"},
		},
	}

	result, err := translator.Translate(notNode)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify bool query with must_not
	boolQuery, ok := result.ESQuery["bool"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected bool query, got %v", result.ESQuery)
	}

	mustNot, ok := boolQuery["must_not"].([]interface{})
	if !ok {
		t.Fatalf("expected must_not array, got %v", boolQuery)
	}

	if len(mustNot) != 1 {
		t.Errorf("expected 1 must_not clause, got %d", len(mustNot))
	}
}

func TestESTranslator_InOperator(t *testing.T) {
	translator := NewESTranslator(DefaultQueryOptions())
	node := &InNode{
		Field:  &FieldNode{Name: "status"},
		Values: []interface{}{"active", "pending", "featured"},
		Negate: false,
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify terms query
	termsQuery, ok := result.ESQuery["terms"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected terms query, got %v", result.ESQuery)
	}

	values, ok := termsQuery["status"].([]interface{})
	if !ok {
		t.Fatalf("expected status values, got %v", termsQuery)
	}

	if len(values) != 3 {
		t.Errorf("expected 3 values, got %d", len(values))
	}
}

func TestESTranslator_NotInOperator(t *testing.T) {
	translator := NewESTranslator(DefaultQueryOptions())
	node := &InNode{
		Field:  &FieldNode{Name: "status"},
		Values: []interface{}{"deleted", "removed"},
		Negate: true,
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify bool query with must_not containing terms
	boolQuery, ok := result.ESQuery["bool"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected bool query, got %v", result.ESQuery)
	}

	mustNot, ok := boolQuery["must_not"].([]interface{})
	if !ok {
		t.Fatalf("expected must_not array, got %v", boolQuery)
	}

	if len(mustNot) != 1 {
		t.Errorf("expected 1 must_not clause, got %d", len(mustNot))
	}
}

func TestESTranslator_RangeOperator(t *testing.T) {
	translator := NewESTranslator(DefaultQueryOptions())
	node := &RangeNode{
		Field: &FieldNode{Name: "score"},
		Min:   10,
		Max:   100,
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify range query
	rangeQuery, ok := result.ESQuery["range"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected range query, got %v", result.ESQuery)
	}

	scoreRange, ok := rangeQuery["score"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected score range, got %v", rangeQuery)
	}

	if scoreRange["gte"] != 10 {
		t.Errorf("expected gte=10, got %v", scoreRange["gte"])
	}

	if scoreRange["lte"] != 100 {
		t.Errorf("expected lte=100, got %v", scoreRange["lte"])
	}
}

func TestESTranslator_FullTextSearch(t *testing.T) {
	translator := NewESTranslator(DefaultQueryOptions())
	node := &FullTextNode{
		Query:  "valorant ace",
		Fields: []string{"title", "creator_name", "game_name"},
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify multi_match query
	multiMatch, ok := result.ESQuery["multi_match"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected multi_match query, got %v", result.ESQuery)
	}

	if multiMatch["query"] != "valorant ace" {
		t.Errorf("expected query='valorant ace', got %v", multiMatch["query"])
	}

	fields, ok := multiMatch["fields"].([]string)
	if !ok {
		t.Fatalf("expected fields array, got %v", multiMatch["fields"])
	}

	if len(fields) != 3 {
		t.Errorf("expected 3 fields, got %d", len(fields))
	}
}

func TestESTranslator_NullChecks(t *testing.T) {
	// IS NULL
	translator := NewESTranslator(DefaultQueryOptions())
	node := &UnaryNode{
		Op:    NodeIsNull,
		Child: &FieldNode{Name: "email"},
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify bool query with must_not exists
	boolQuery, ok := result.ESQuery["bool"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected bool query, got %v", result.ESQuery)
	}

	mustNot, ok := boolQuery["must_not"].([]interface{})
	if !ok {
		t.Fatalf("expected must_not array, got %v", boolQuery)
	}

	if len(mustNot) != 1 {
		t.Errorf("expected 1 must_not clause, got %d", len(mustNot))
	}

	// IS NOT NULL
	translator = NewESTranslator(DefaultQueryOptions())
	node = &UnaryNode{
		Op:    NodeIsNotNull,
		Child: &FieldNode{Name: "email"},
	}

	result, err = translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify exists query
	exists, ok := result.ESQuery["exists"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected exists query, got %v", result.ESQuery)
	}

	if exists["field"] != "email" {
		t.Errorf("expected field='email', got %v", exists["field"])
	}
}

func TestESTranslator_BuildSearchQuery(t *testing.T) {
	opts := DefaultQueryOptions()
	opts.Limit = 20
	opts.Page = 1
	translator := NewESTranslator(opts)

	node := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status"},
		Right: &LiteralNode{Value: "active"},
	}

	result, err := translator.BuildSearchQuery(node, "created_at", "DESC")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify query structure
	if result.ESQuery["from"] != 0 {
		t.Errorf("expected from=0, got %v", result.ESQuery["from"])
	}

	if result.ESQuery["size"] != 20 {
		t.Errorf("expected size=20, got %v", result.ESQuery["size"])
	}

	// Verify sort
	sort, ok := result.ESQuery["sort"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected sort array, got %v", result.ESQuery["sort"])
	}

	if len(sort) != 1 {
		t.Errorf("expected 1 sort field, got %d", len(sort))
	}
}

func TestESTranslator_BuildMatchAllQuery(t *testing.T) {
	opts := DefaultQueryOptions()
	opts.Limit = 10
	opts.Page = 2
	translator := NewESTranslator(opts)

	result, err := translator.BuildMatchAllQuery(nil, "score", "DESC")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify match_all query
	query, ok := result.ESQuery["query"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected query, got %v", result.ESQuery)
	}

	if _, ok := query["match_all"]; !ok {
		t.Errorf("expected match_all query, got %v", query)
	}

	// Verify pagination
	if result.ESQuery["from"] != 10 { // Page 2, limit 10 = offset 10
		t.Errorf("expected from=10, got %v", result.ESQuery["from"])
	}
}

func TestESTranslator_FieldMapping(t *testing.T) {
	opts := DefaultQueryOptions()
	opts.FieldMapping = map[string]string{
		"name": "title.keyword",
	}
	translator := NewESTranslator(opts)

	node := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "name"},
		Right: &LiteralNode{Value: "test"},
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify the mapped field name
	termQuery, ok := result.ESQuery["term"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected term query, got %v", result.ESQuery)
	}

	if _, exists := termQuery["title.keyword"]; !exists {
		t.Errorf("expected field 'title.keyword', got %v", termQuery)
	}
}

func TestESTranslator_JSONSerialization(t *testing.T) {
	translator := NewESTranslator(DefaultQueryOptions())
	node := &BinaryNode{
		Op: NodeAnd,
		Left: &BinaryNode{
			Op:    NodeEquals,
			Left:  &FieldNode{Name: "status"},
			Right: &LiteralNode{Value: "active"},
		},
		Right: &BinaryNode{
			Op:    NodeGreaterThan,
			Left:  &FieldNode{Name: "score"},
			Right: &LiteralNode{Value: 50},
		},
	}

	result, err := translator.BuildSearchQuery(node, "created_at", "DESC")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify the query can be serialized to JSON
	jsonBytes, err := json.Marshal(result.ESQuery)
	if err != nil {
		t.Fatalf("failed to marshal query to JSON: %v", err)
	}

	// Verify the JSON can be parsed back
	var parsed map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &parsed); err != nil {
		t.Fatalf("failed to unmarshal JSON: %v", err)
	}

	// Verify structure
	if _, exists := parsed["query"]; !exists {
		t.Error("expected 'query' in JSON")
	}
	if _, exists := parsed["from"]; !exists {
		t.Error("expected 'from' in JSON")
	}
	if _, exists := parsed["size"]; !exists {
		t.Error("expected 'size' in JSON")
	}
}
