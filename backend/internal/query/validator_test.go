package query

import (
	"testing"
)

func TestValidator_ValidQueries(t *testing.T) {
	config := DefaultValidatorConfig()
	validator := NewValidator(config)

	tests := []struct {
		name string
		node Node
	}{
		{
			name: "simple equality",
			node: &BinaryNode{
				Op:    NodeEquals,
				Left:  &FieldNode{Name: "status"},
				Right: &LiteralNode{Value: "active"},
			},
		},
		{
			name: "comparison",
			node: &BinaryNode{
				Op:    NodeGreaterThan,
				Left:  &FieldNode{Name: "score"},
				Right: &LiteralNode{Value: 100},
			},
		},
		{
			name: "logical AND",
			node: &BinaryNode{
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
			},
		},
		{
			name: "IN clause",
			node: &InNode{
				Field:  &FieldNode{Name: "status"},
				Values: []interface{}{"active", "pending"},
			},
		},
		{
			name: "range query",
			node: &RangeNode{
				Field: &FieldNode{Name: "score"},
				Min:   10,
				Max:   100,
			},
		},
		{
			name: "full-text search",
			node: &FullTextNode{
				Query:  "valorant ace",
				Fields: []string{"title", "description"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			errors := validator.Validate(tt.node)
			if len(errors) > 0 {
				t.Errorf("expected no errors, got %v", errors)
			}
		})
	}
}

func TestValidator_InvalidFieldNames(t *testing.T) {
	config := DefaultValidatorConfig()
	validator := NewValidator(config)

	tests := []struct {
		name      string
		fieldName string
		wantErr   bool
	}{
		{"valid field", "status", false},
		{"field with underscore", "created_at", false},
		{"qualified field", "clips.status", false},
		{"starts with number", "1invalid", true},
		{"contains special char", "field-name", true},
		{"empty field", "", true},
		{"SQL injection", "status; DROP TABLE--", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node := &BinaryNode{
				Op:    NodeEquals,
				Left:  &FieldNode{Name: tt.fieldName},
				Right: &LiteralNode{Value: "test"},
			}
			errors := validator.Validate(node)
			hasErr := len(errors) > 0
			if hasErr != tt.wantErr {
				t.Errorf("expected error=%v, got errors=%v", tt.wantErr, errors)
			}
		})
	}
}

func TestValidator_AllowedFields(t *testing.T) {
	config := DefaultValidatorConfig()
	config.AllowedFields = []string{"status", "score", "created_at"}
	validator := NewValidator(config)

	tests := []struct {
		name      string
		fieldName string
		wantErr   bool
	}{
		{"allowed field", "status", false},
		{"another allowed field", "score", false},
		{"not allowed field", "password", true},
		{"not allowed field 2", "email", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node := &BinaryNode{
				Op:    NodeEquals,
				Left:  &FieldNode{Name: tt.fieldName},
				Right: &LiteralNode{Value: "test"},
			}
			errors := validator.Validate(node)
			hasErr := len(errors) > 0
			if hasErr != tt.wantErr {
				t.Errorf("expected error=%v, got errors=%v", tt.wantErr, errors)
			}
		})
	}
}

func TestValidator_DisallowedFields(t *testing.T) {
	config := DefaultValidatorConfig()
	config.DisallowedFields = []string{"password", "secret", "api_key"}
	validator := NewValidator(config)

	tests := []struct {
		name      string
		fieldName string
		wantErr   bool
	}{
		{"normal field", "status", false},
		{"disallowed field", "password", true},
		{"another disallowed field", "secret", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node := &BinaryNode{
				Op:    NodeEquals,
				Left:  &FieldNode{Name: tt.fieldName},
				Right: &LiteralNode{Value: "test"},
			}
			errors := validator.Validate(node)
			hasErr := len(errors) > 0
			if hasErr != tt.wantErr {
				t.Errorf("expected error=%v, got errors=%v", tt.wantErr, errors)
			}
		})
	}
}

func TestValidator_MaxDepth(t *testing.T) {
	config := DefaultValidatorConfig()
	config.MaxDepth = 3
	validator := NewValidator(config)

	// Create a query within depth limit
	shallowNode := &BinaryNode{
		Op: NodeAnd,
		Left: &BinaryNode{
			Op:    NodeEquals,
			Left:  &FieldNode{Name: "a"},
			Right: &LiteralNode{Value: 1},
		},
		Right: &BinaryNode{
			Op:    NodeEquals,
			Left:  &FieldNode{Name: "b"},
			Right: &LiteralNode{Value: 2},
		},
	}

	errors := validator.Validate(shallowNode)
	if len(errors) > 0 {
		t.Errorf("expected no errors for shallow query, got %v", errors)
	}

	// Create a deeply nested query exceeding depth limit
	deepNode := createDeepNode(10)
	errors = validator.Validate(deepNode)
	if len(errors) == 0 {
		t.Error("expected error for deep query, got none")
	}
}

func createDeepNode(depth int) Node {
	if depth <= 1 {
		return &BinaryNode{
			Op:    NodeEquals,
			Left:  &FieldNode{Name: "field"},
			Right: &LiteralNode{Value: "value"},
		}
	}
	return &BinaryNode{
		Op:    NodeAnd,
		Left:  createDeepNode(depth - 1),
		Right: &LiteralNode{Value: depth},
	}
}

func TestValidator_MaxInValues(t *testing.T) {
	config := DefaultValidatorConfig()
	config.MaxInValues = 5
	validator := NewValidator(config)

	// Within limit
	smallIn := &InNode{
		Field:  &FieldNode{Name: "id"},
		Values: []interface{}{1, 2, 3},
	}
	errors := validator.Validate(smallIn)
	if len(errors) > 0 {
		t.Errorf("expected no errors for small IN, got %v", errors)
	}

	// Exceeds limit
	largeIn := &InNode{
		Field:  &FieldNode{Name: "id"},
		Values: make([]interface{}, 10),
	}
	for i := range largeIn.Values {
		largeIn.Values[i] = i
	}
	errors = validator.Validate(largeIn)
	if len(errors) == 0 {
		t.Error("expected error for large IN, got none")
	}
}

func TestValidator_MaxStringLength(t *testing.T) {
	config := DefaultValidatorConfig()
	config.MaxStringLength = 10
	validator := NewValidator(config)

	// Within limit
	shortString := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "name"},
		Right: &LiteralNode{Value: "short"},
	}
	errors := validator.Validate(shortString)
	if len(errors) > 0 {
		t.Errorf("expected no errors for short string, got %v", errors)
	}

	// Exceeds limit
	longString := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "name"},
		Right: &LiteralNode{Value: "this is a very long string that exceeds the limit"},
	}
	errors = validator.Validate(longString)
	if len(errors) == 0 {
		t.Error("expected error for long string, got none")
	}
}

func TestValidator_SQLInjectionDetection(t *testing.T) {
	config := DefaultValidatorConfig()
	validator := NewValidator(config)

	tests := []struct {
		name    string
		value   string
		wantErr bool
	}{
		{"normal value", "test", false},
		{"DROP TABLE", "; DROP TABLE users;--", true},
		{"UNION SELECT", "1 UNION SELECT * FROM users", true},
		{"comment injection", "value--comment", true},
		{"block comment", "value/*comment*/", true},
		{"DELETE injection", "; DELETE FROM users WHERE 1=1;", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node := &BinaryNode{
				Op:    NodeEquals,
				Left:  &FieldNode{Name: "field"},
				Right: &LiteralNode{Value: tt.value},
			}
			errors := validator.Validate(node)
			hasErr := len(errors) > 0
			if hasErr != tt.wantErr {
				t.Errorf("expected error=%v, got errors=%v", tt.wantErr, errors)
			}
		})
	}
}

func TestValidator_FullTextSearchValidation(t *testing.T) {
	config := DefaultValidatorConfig()
	validator := NewValidator(config)

	// Valid full-text search
	validFT := &FullTextNode{
		Query:  "valorant ace",
		Fields: []string{"title", "description"},
	}
	errors := validator.Validate(validFT)
	if len(errors) > 0 {
		t.Errorf("expected no errors for valid full-text, got %v", errors)
	}

	// Empty query
	emptyFT := &FullTextNode{
		Query:  "",
		Fields: []string{"title"},
	}
	errors = validator.Validate(emptyFT)
	if len(errors) == 0 {
		t.Error("expected error for empty full-text query, got none")
	}

	// Invalid field in full-text search
	invalidFieldFT := &FullTextNode{
		Query:  "test",
		Fields: []string{"valid_field", "1invalid"},
	}
	errors = validator.Validate(invalidFieldFT)
	if len(errors) == 0 {
		t.Error("expected error for invalid field in full-text, got none")
	}
}

func TestValidator_WildcardControl(t *testing.T) {
	// Wildcards allowed
	configAllowed := DefaultValidatorConfig()
	configAllowed.AllowWildcards = true
	validatorAllowed := NewValidator(configAllowed)

	ftWithWildcard := &FullTextNode{
		Query:  "test*",
		Fields: []string{"title"},
	}
	errors := validatorAllowed.Validate(ftWithWildcard)
	if len(errors) > 0 {
		t.Errorf("expected no errors when wildcards allowed, got %v", errors)
	}

	// Wildcards not allowed
	configNotAllowed := DefaultValidatorConfig()
	configNotAllowed.AllowWildcards = false
	validatorNotAllowed := NewValidator(configNotAllowed)

	errors = validatorNotAllowed.Validate(ftWithWildcard)
	if len(errors) == 0 {
		t.Error("expected error when wildcards not allowed, got none")
	}
}

func TestValidator_IsValid(t *testing.T) {
	config := DefaultValidatorConfig()
	validator := NewValidator(config)

	validNode := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "status"},
		Right: &LiteralNode{Value: "active"},
	}

	if !validator.IsValid(validNode) {
		t.Error("expected valid node to return true")
	}

	invalidNode := &BinaryNode{
		Op:    NodeEquals,
		Left:  &FieldNode{Name: "1invalid"},
		Right: &LiteralNode{Value: "test"},
	}

	if validator.IsValid(invalidNode) {
		t.Error("expected invalid node to return false")
	}
}

func TestSafeQueryLimits_ApplyLimits(t *testing.T) {
	limits := DefaultSafeQueryLimits()

	tests := []struct {
		name          string
		inputLimit    int
		inputOffset   int
		expectedLimit int
		expectedOffset int
	}{
		{"normal values", 20, 0, 20, 0},
		{"zero limit", 0, 0, limits.DefaultLimit, 0},
		{"negative limit", -1, 0, limits.DefaultLimit, 0},
		{"exceeds max limit", 500, 0, limits.MaxLimit, 0},
		{"negative offset", 20, -10, 20, 0},
		{"exceeds max offset", 20, 20000, 20, limits.MaxOffset},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts := &QueryOptions{
				Limit:  tt.inputLimit,
				Offset: tt.inputOffset,
			}
			limits.ApplyLimits(opts)

			if opts.Limit != tt.expectedLimit {
				t.Errorf("expected limit=%d, got %d", tt.expectedLimit, opts.Limit)
			}
			if opts.Offset != tt.expectedOffset {
				t.Errorf("expected offset=%d, got %d", tt.expectedOffset, opts.Offset)
			}
		})
	}
}

func TestSafeQueryLimits_ValidateQueryOptions(t *testing.T) {
	limits := DefaultSafeQueryLimits()

	// Valid options
	validOpts := &QueryOptions{
		Limit:    20,
		Offset:   0,
		Page:     1,
		OrderDir: "DESC",
	}
	errors := limits.ValidateQueryOptions(validOpts)
	if len(errors) > 0 {
		t.Errorf("expected no errors for valid options, got %v", errors)
	}

	// Invalid sort direction
	invalidDir := &QueryOptions{
		Limit:    20,
		Offset:   0,
		OrderDir: "INVALID",
	}
	errors = limits.ValidateQueryOptions(invalidDir)
	if len(errors) == 0 {
		t.Error("expected error for invalid sort direction, got none")
	}

	// Negative offset
	negativeOffset := &QueryOptions{
		Limit:  20,
		Offset: -10,
	}
	errors = limits.ValidateQueryOptions(negativeOffset)
	if len(errors) == 0 {
		t.Error("expected error for negative offset, got none")
	}

	// Negative page
	negativePage := &QueryOptions{
		Limit: 20,
		Page:  -1,
	}
	errors = limits.ValidateQueryOptions(negativePage)
	if len(errors) == 0 {
		t.Error("expected error for negative page, got none")
	}
}
