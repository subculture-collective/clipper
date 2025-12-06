package query

import (
	"strings"
	"testing"
)

func TestSQLTranslator_SimpleEquality(t *testing.T) {
	opts := DefaultQueryOptions()
	translator := NewSQLTranslator(opts)

	node := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status"},
		Right: &LiteralNode{Value: "active"},
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.SQL != "status = $1" {
		t.Errorf("expected 'status = $1', got %q", result.SQL)
	}

	if len(result.Args) != 1 || result.Args[0] != "active" {
		t.Errorf("expected args ['active'], got %v", result.Args)
	}
}

func TestSQLTranslator_ComparisonOperators(t *testing.T) {
	tests := []struct {
		name     string
		op       NodeType
		expected string
	}{
		{"equals", NodeEquals, "score = $1"},
		{"not equals", NodeNotEquals, "score != $1"},
		{"greater than", NodeGreaterThan, "score > $1"},
		{"greater than or equal", NodeGreaterThanOrEqual, "score >= $1"},
		{"less than", NodeLessThan, "score < $1"},
		{"less than or equal", NodeLessThanOrEqual, "score <= $1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			translator := NewSQLTranslator(DefaultQueryOptions())
			node := &BinaryNode{
				Op:    tt.op,
				Left:  &FieldNode{Name: "score"},
				Right: &LiteralNode{Value: 100},
			}

			result, err := translator.Translate(node)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if result.SQL != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result.SQL)
			}
		})
	}
}

func TestSQLTranslator_LogicalOperators(t *testing.T) {
	translator := NewSQLTranslator(DefaultQueryOptions())

	// AND
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

	if !strings.Contains(result.SQL, "AND") {
		t.Errorf("expected AND in SQL, got %q", result.SQL)
	}

	// OR
	translator = NewSQLTranslator(DefaultQueryOptions())
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

	if !strings.Contains(result.SQL, "OR") {
		t.Errorf("expected OR in SQL, got %q", result.SQL)
	}

	// NOT
	translator = NewSQLTranslator(DefaultQueryOptions())
	notNode := &UnaryNode{
		Op: NodeNot,
		Child: &BinaryNode{
			Op:    NodeEquals,
			Left:  &FieldNode{Name: "status"},
			Right: &LiteralNode{Value: "deleted"},
		},
	}

	result, err = translator.Translate(notNode)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "NOT") {
		t.Errorf("expected NOT in SQL, got %q", result.SQL)
	}
}

func TestSQLTranslator_InOperator(t *testing.T) {
	translator := NewSQLTranslator(DefaultQueryOptions())

	node := &InNode{
		Field:  &FieldNode{Name: "status"},
		Values: []interface{}{"active", "pending", "featured"},
		Negate: false,
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "IN") {
		t.Errorf("expected IN in SQL, got %q", result.SQL)
	}

	if len(result.Args) != 3 {
		t.Errorf("expected 3 args, got %d", len(result.Args))
	}

	// NOT IN
	translator = NewSQLTranslator(DefaultQueryOptions())
	node.Negate = true
	result, err = translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "NOT IN") {
		t.Errorf("expected NOT IN in SQL, got %q", result.SQL)
	}
}

func TestSQLTranslator_RangeOperator(t *testing.T) {
	translator := NewSQLTranslator(DefaultQueryOptions())

	node := &RangeNode{
		Field: &FieldNode{Name: "score"},
		Min:   10,
		Max:   100,
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "BETWEEN") {
		t.Errorf("expected BETWEEN in SQL, got %q", result.SQL)
	}

	if len(result.Args) != 2 {
		t.Errorf("expected 2 args, got %d", len(result.Args))
	}
}

func TestSQLTranslator_FullTextSearch(t *testing.T) {
	translator := NewSQLTranslator(DefaultQueryOptions())

	node := &FullTextNode{
		Query:  "valorant ace",
		Fields: []string{"title", "creator_name"},
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "to_tsquery") {
		t.Errorf("expected to_tsquery in SQL, got %q", result.SQL)
	}

	if !strings.Contains(result.SQL, "@@") {
		t.Errorf("expected @@ operator in SQL, got %q", result.SQL)
	}
}

func TestSQLTranslator_NullChecks(t *testing.T) {
	// IS NULL
	translator := NewSQLTranslator(DefaultQueryOptions())
	node := &UnaryNode{
		Op:    NodeIsNull,
		Child: &FieldNode{Name: "email"},
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "IS NULL") {
		t.Errorf("expected IS NULL in SQL, got %q", result.SQL)
	}

	// IS NOT NULL
	translator = NewSQLTranslator(DefaultQueryOptions())
	node = &UnaryNode{
		Op:    NodeIsNotNull,
		Child: &FieldNode{Name: "email"},
	}

	result, err = translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "IS NOT NULL") {
		t.Errorf("expected IS NOT NULL in SQL, got %q", result.SQL)
	}
}

func TestSQLTranslator_TableAlias(t *testing.T) {
	opts := DefaultQueryOptions()
	translator := NewSQLTranslator(opts)
	translator.SetTableAlias("c")

	node := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status"},
		Right: &LiteralNode{Value: "active"},
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "c.status") {
		t.Errorf("expected 'c.status' in SQL, got %q", result.SQL)
	}
}

func TestSQLTranslator_FieldValidation(t *testing.T) {
	opts := DefaultQueryOptions()
	opts.AllowedFields = []string{"status", "score", "created_at"}
	translator := NewSQLTranslator(opts)

	// Allowed field
	node := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status"},
		Right: &LiteralNode{Value: "active"},
	}

	_, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error for allowed field: %v", err)
	}

	// Not allowed field
	translator = NewSQLTranslator(opts)
	node = &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "password"},
		Right: &LiteralNode{Value: "secret"},
	}

	_, err = translator.Translate(node)
	if err == nil {
		t.Error("expected error for disallowed field")
	}
}

func TestSQLTranslator_SafeLimits(t *testing.T) {
	opts := DefaultQueryOptions()
	opts.Limit = 1000 // Exceeds max
	opts.MaxLimit = 100
	opts.DefaultLimit = 20

	translator := NewSQLTranslator(opts)
	node := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status"},
		Right: &LiteralNode{Value: "active"},
	}

	result, err := translator.Translate(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Limit != 100 {
		t.Errorf("expected limit to be capped at 100, got %d", result.Limit)
	}
}

func TestSQLTranslator_BuildSelectQuery(t *testing.T) {
	opts := DefaultQueryOptions()
	opts.Limit = 20
	opts.Page = 1
	translator := NewSQLTranslator(opts)

	whereNode := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status"},
		Right: &LiteralNode{Value: "active"},
	}

	result, err := translator.BuildSelectQuery("clips", []string{"id", "title", "status"}, whereNode, "created_at")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "SELECT") {
		t.Errorf("expected SELECT in SQL, got %q", result.SQL)
	}

	if !strings.Contains(result.SQL, "FROM clips") {
		t.Errorf("expected FROM clips in SQL, got %q", result.SQL)
	}

	if !strings.Contains(result.SQL, "WHERE") {
		t.Errorf("expected WHERE in SQL, got %q", result.SQL)
	}

	if !strings.Contains(result.SQL, "LIMIT") {
		t.Errorf("expected LIMIT in SQL, got %q", result.SQL)
	}

	if !strings.Contains(result.SQL, "OFFSET") {
		t.Errorf("expected OFFSET in SQL, got %q", result.SQL)
	}
}

func TestSQLTranslator_BuildCountQuery(t *testing.T) {
	translator := NewSQLTranslator(DefaultQueryOptions())

	whereNode := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status"},
		Right: &LiteralNode{Value: "active"},
	}

	result, err := translator.BuildCountQuery("clips", whereNode)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(result.SQL, "COUNT(*)") {
		t.Errorf("expected COUNT(*) in SQL, got %q", result.SQL)
	}

	if !strings.Contains(result.SQL, "FROM clips") {
		t.Errorf("expected FROM clips in SQL, got %q", result.SQL)
	}
}

func TestSQLTranslator_PreventSQLInjection(t *testing.T) {
	translator := NewSQLTranslator(DefaultQueryOptions())

	// Invalid field name (SQL injection attempt)
	node := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status; DROP TABLE users;--"},
		Right: &LiteralNode{Value: "active"},
	}

	_, err := translator.Translate(node)
	if err == nil {
		t.Error("expected error for SQL injection attempt in field name")
	}
}

func TestSQLTranslator_MaxDepthLimit(t *testing.T) {
	translator := NewSQLTranslator(DefaultQueryOptions())
	translator.maxDepth = 3

	// Create deeply nested query
	node := &BinaryNode{
		Op: NodeAnd,
		Left: &BinaryNode{
			Op: NodeAnd,
			Left: &BinaryNode{
				Op: NodeAnd,
				Left: &BinaryNode{
					Op:    NodeEquals,
					Left:  &FieldNode{Name: "a"},
					Right: &LiteralNode{Value: 1},
				},
				Right: &LiteralNode{Value: 2},
			},
			Right: &LiteralNode{Value: 3},
		},
		Right: &LiteralNode{Value: 4},
	}

	_, err := translator.Translate(node)
	if err == nil {
		t.Error("expected error for max depth exceeded")
	}
}

func TestSQLTranslator_MaxInValues(t *testing.T) {
	translator := NewSQLTranslator(DefaultQueryOptions())
	translator.maxInValues = 5

	// Too many IN values
	values := make([]interface{}, 10)
	for i := range values {
		values[i] = i
	}

	node := &InNode{
		Field:  &FieldNode{Name: "id"},
		Values: values,
	}

	_, err := translator.Translate(node)
	if err == nil {
		t.Error("expected error for too many IN values")
	}
}
