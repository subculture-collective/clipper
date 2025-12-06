package query

import (
	"testing"
)

func TestParseQuery_SimpleEquality(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantErr  bool
		validate func(t *testing.T, node Node)
	}{
		{
			name:    "simple equality",
			input:   "status = 'active'",
			wantErr: false,
			validate: func(t *testing.T, node Node) {
				bn, ok := node.(*BinaryNode)
				if !ok {
					t.Fatalf("expected BinaryNode, got %T", node)
				}
				if bn.Op != NodeEquals {
					t.Errorf("expected NodeEquals, got %v", bn.Op)
				}
			},
		},
		{
			name:    "numeric equality",
			input:   "vote_score = 100",
			wantErr: false,
			validate: func(t *testing.T, node Node) {
				bn, ok := node.(*BinaryNode)
				if !ok {
					t.Fatalf("expected BinaryNode, got %T", node)
				}
				lit, ok := bn.Right.(*LiteralNode)
				if !ok {
					t.Fatalf("expected LiteralNode, got %T", bn.Right)
				}
				if lit.Value != int64(100) {
					t.Errorf("expected 100, got %v", lit.Value)
				}
			},
		},
		{
			name:    "not equals",
			input:   "status != 'deleted'",
			wantErr: false,
			validate: func(t *testing.T, node Node) {
				bn, ok := node.(*BinaryNode)
				if !ok {
					t.Fatalf("expected BinaryNode, got %T", node)
				}
				if bn.Op != NodeNotEquals {
					t.Errorf("expected NodeNotEquals, got %v", bn.Op)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node, err := ParseQuery(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.validate != nil && node != nil {
				tt.validate(t, node)
			}
		})
	}
}

func TestParseQuery_Comparisons(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantOp   NodeType
		wantErr  bool
	}{
		{"greater than", "score > 50", NodeGreaterThan, false},
		{"greater than or equal", "score >= 50", NodeGreaterThanOrEqual, false},
		{"less than", "score < 50", NodeLessThan, false},
		{"less than or equal", "score <= 50", NodeLessThanOrEqual, false},
		{"like", "name LIKE '%test%'", NodeLike, false},
		{"ilike", "name ILIKE '%test%'", NodeILike, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node, err := ParseQuery(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if bn, ok := node.(*BinaryNode); ok {
				if bn.Op != tt.wantOp {
					t.Errorf("expected %v, got %v", tt.wantOp, bn.Op)
				}
			} else {
				t.Errorf("expected BinaryNode, got %T", node)
			}
		})
	}
}

func TestParseQuery_LogicalOperators(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"simple AND", "status = 'active' AND type = 'clip'", false},
		{"simple OR", "status = 'active' OR status = 'pending'", false},
		{"NOT expression", "NOT status = 'deleted'", false},
		{"complex AND/OR", "(status = 'active' OR status = 'pending') AND type = 'clip'", false},
		{"nested NOT", "NOT (status = 'deleted' OR is_removed = 1)", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseQuery(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseQuery() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestParseQuery_InOperator(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		wantNegate bool
		wantErr    bool
	}{
		{"IN with numbers", "id IN (1, 2, 3)", false, false},
		{"IN with strings", "status IN ('active', 'pending')", false, false},
		{"NOT IN", "status NOT IN ('deleted', 'removed')", true, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node, err := ParseQuery(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if inNode, ok := node.(*InNode); ok {
				if inNode.Negate != tt.wantNegate {
					t.Errorf("expected Negate=%v, got %v", tt.wantNegate, inNode.Negate)
				}
			} else {
				t.Errorf("expected InNode, got %T", node)
			}
		})
	}
}

func TestParseQuery_BetweenOperator(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"BETWEEN numbers", "score BETWEEN 10 AND 100", false},
		{"BETWEEN strings", "date BETWEEN '2024-01-01' AND '2024-12-31'", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node, err := ParseQuery(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if _, ok := node.(*RangeNode); !ok {
				t.Errorf("expected RangeNode, got %T", node)
			}
		})
	}
}

func TestParseQuery_NullChecks(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantOp  NodeType
		wantErr bool
	}{
		{"IS NULL", "email IS NULL", NodeIsNull, false},
		{"IS NOT NULL", "email IS NOT NULL", NodeIsNotNull, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node, err := ParseQuery(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if un, ok := node.(*UnaryNode); ok {
				if un.Op != tt.wantOp {
					t.Errorf("expected %v, got %v", tt.wantOp, un.Op)
				}
			} else {
				t.Errorf("expected UnaryNode, got %T", node)
			}
		})
	}
}

func TestParseQuery_ComplexQueries(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{
			name:    "multi-condition with parentheses",
			input:   "(status = 'active' AND score > 50) OR (status = 'featured' AND score >= 100)",
			wantErr: false,
		},
		{
			name:    "nested conditions",
			input:   "category = 'gaming' AND (game_id IN ('valorant', 'csgo') OR creator_id = 'shroud')",
			wantErr: false,
		},
		{
			name:    "mixed operators",
			input:   "status = 'active' AND vote_score >= 10 AND created_at BETWEEN '2024-01-01' AND '2024-12-31'",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseQuery(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseQuery() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestParseQuery_Errors(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"empty query", "", true},
		{"unterminated string", "name = 'test", true},
		{"invalid operator", "name & 'test'", true},
		{"missing operand", "name = ", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseQuery(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseQuery() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestParseSimpleQuery(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		fields []string
	}{
		{"simple search", "valorant ace", []string{"title", "creator_name"}},
		{"multi-word search", "funny stream moments", []string{"title", "description"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node := ParseSimpleQuery(tt.input, tt.fields)
			if ft, ok := node.(*FullTextNode); ok {
				if ft.Query != tt.input {
					t.Errorf("expected query %q, got %q", tt.input, ft.Query)
				}
				if len(ft.Fields) != len(tt.fields) {
					t.Errorf("expected %d fields, got %d", len(tt.fields), len(ft.Fields))
				}
			} else {
				t.Errorf("expected FullTextNode, got %T", node)
			}
		})
	}
}
