package query

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

// TokenType represents the type of a lexical token
type TokenType int

const (
	TokenEOF TokenType = iota
	TokenLParen
	TokenRParen
	TokenAnd
	TokenOr
	TokenNot
	TokenEq
	TokenNe
	TokenGt
	TokenGe
	TokenLt
	TokenLe
	TokenLike
	TokenILike
	TokenIn
	TokenBetween
	TokenIsNull
	TokenIsNotNull
	TokenIdent
	TokenString
	TokenNumber
	TokenColon
	TokenComma
	TokenLBracket
	TokenRBracket
)

// Token represents a lexical token
type Token struct {
	Type    TokenType
	Value   string
	Line    int
	Column  int
}

// Lexer tokenizes a query string
type Lexer struct {
	input   string
	pos     int
	line    int
	col     int
	tokens  []Token
}

// NewLexer creates a new lexer for the given input
func NewLexer(input string) *Lexer {
	return &Lexer{
		input:  input,
		pos:    0,
		line:   1,
		col:    1,
		tokens: make([]Token, 0),
	}
}

// Tokenize converts the input into a stream of tokens
func (l *Lexer) Tokenize() ([]Token, error) {
	for l.pos < len(l.input) {
		// Skip whitespace
		if unicode.IsSpace(rune(l.input[l.pos])) {
			l.advance()
			continue
		}

		// Handle different token types
		ch := l.input[l.pos]

		switch ch {
		case '(':
			l.addToken(TokenLParen, "(")
		case ')':
			l.addToken(TokenRParen, ")")
		case '[':
			l.addToken(TokenLBracket, "[")
		case ']':
			l.addToken(TokenRBracket, "]")
		case ',':
			l.addToken(TokenComma, ",")
		case ':':
			l.addToken(TokenColon, ":")
		case '=':
			l.addToken(TokenEq, "=")
		case '!':
			if l.peek() == '=' {
				l.advance()
				l.addToken(TokenNe, "!=")
			} else {
				return nil, fmt.Errorf("unexpected character '!' at line %d, column %d", l.line, l.col)
			}
		case '>':
			if l.peek() == '=' {
				l.advance()
				l.addToken(TokenGe, ">=")
			} else {
				l.addToken(TokenGt, ">")
			}
		case '<':
			if l.peek() == '=' {
				l.advance()
				l.addToken(TokenLe, "<=")
			} else if l.peek() == '>' {
				l.advance()
				l.addToken(TokenNe, "<>")
			} else {
				l.addToken(TokenLt, "<")
			}
		case '"', '\'':
			str, err := l.readString(ch)
			if err != nil {
				return nil, err
			}
			l.tokens = append(l.tokens, Token{Type: TokenString, Value: str, Line: l.line, Column: l.col})
		default:
			if unicode.IsDigit(rune(ch)) || ch == '-' || ch == '.' {
				num := l.readNumber()
				l.tokens = append(l.tokens, Token{Type: TokenNumber, Value: num, Line: l.line, Column: l.col})
				continue
			}
			if unicode.IsLetter(rune(ch)) || ch == '_' {
				ident := l.readIdent()
				tok := l.identToToken(ident)
				l.tokens = append(l.tokens, tok)
				continue
			}
			return nil, fmt.Errorf("unexpected character '%c' at line %d, column %d", ch, l.line, l.col)
		}
		l.advance()
	}

	l.tokens = append(l.tokens, Token{Type: TokenEOF, Line: l.line, Column: l.col})
	return l.tokens, nil
}

func (l *Lexer) advance() {
	if l.pos < len(l.input) {
		if l.input[l.pos] == '\n' {
			l.line++
			l.col = 1
		} else {
			l.col++
		}
		l.pos++
	}
}

func (l *Lexer) peek() byte {
	if l.pos+1 < len(l.input) {
		return l.input[l.pos+1]
	}
	return 0
}

func (l *Lexer) addToken(typ TokenType, value string) {
	l.tokens = append(l.tokens, Token{Type: typ, Value: value, Line: l.line, Column: l.col})
}

func (l *Lexer) readString(quote byte) (string, error) {
	l.advance() // skip opening quote
	start := l.pos

	for l.pos < len(l.input) && l.input[l.pos] != quote {
		if l.input[l.pos] == '\\' && l.pos+1 < len(l.input) {
			l.advance() // skip escape char
		}
		l.advance()
	}

	if l.pos >= len(l.input) {
		return "", fmt.Errorf("unterminated string at line %d, column %d", l.line, l.col)
	}

	return l.input[start:l.pos], nil
}

func (l *Lexer) readNumber() string {
	start := l.pos
	hasDecimal := false

	// Handle negative sign
	if l.pos < len(l.input) && l.input[l.pos] == '-' {
		l.advance()
	}

	for l.pos < len(l.input) {
		ch := l.input[l.pos]
		if ch == '.' && !hasDecimal {
			hasDecimal = true
			l.advance()
		} else if unicode.IsDigit(rune(ch)) {
			l.advance()
		} else {
			break
		}
	}

	return l.input[start:l.pos]
}

func (l *Lexer) readIdent() string {
	start := l.pos
	for l.pos < len(l.input) {
		ch := l.input[l.pos]
		if unicode.IsLetter(rune(ch)) || unicode.IsDigit(rune(ch)) || ch == '_' || ch == '.' {
			l.advance()
		} else {
			break
		}
	}
	return l.input[start:l.pos]
}

func (l *Lexer) identToToken(ident string) Token {
	upper := strings.ToUpper(ident)
	switch upper {
	case "AND":
		return Token{Type: TokenAnd, Value: ident, Line: l.line, Column: l.col}
	case "OR":
		return Token{Type: TokenOr, Value: ident, Line: l.line, Column: l.col}
	case "NOT":
		return Token{Type: TokenNot, Value: ident, Line: l.line, Column: l.col}
	case "LIKE":
		return Token{Type: TokenLike, Value: ident, Line: l.line, Column: l.col}
	case "ILIKE":
		return Token{Type: TokenILike, Value: ident, Line: l.line, Column: l.col}
	case "IN":
		return Token{Type: TokenIn, Value: ident, Line: l.line, Column: l.col}
	case "BETWEEN":
		return Token{Type: TokenBetween, Value: ident, Line: l.line, Column: l.col}
	case "NULL":
		return Token{Type: TokenIdent, Value: "NULL", Line: l.line, Column: l.col}
	case "IS":
		return Token{Type: TokenIdent, Value: "IS", Line: l.line, Column: l.col}
	default:
		return Token{Type: TokenIdent, Value: ident, Line: l.line, Column: l.col}
	}
}

// Parser converts tokens to AST nodes
type Parser struct {
	tokens []Token
	pos    int
}

// NewParser creates a new parser for the given tokens
func NewParser(tokens []Token) *Parser {
	return &Parser{
		tokens: tokens,
		pos:    0,
	}
}

// Parse parses the tokens into an AST
func (p *Parser) Parse() (Node, error) {
	if len(p.tokens) == 0 || p.tokens[0].Type == TokenEOF {
		return nil, ErrEmptyQuery
	}
	return p.parseOr()
}

func (p *Parser) current() Token {
	if p.pos < len(p.tokens) {
		return p.tokens[p.pos]
	}
	return Token{Type: TokenEOF}
}

func (p *Parser) advance() Token {
	tok := p.current()
	p.pos++
	return tok
}

func (p *Parser) expect(typ TokenType) (Token, error) {
	tok := p.advance()
	if tok.Type != typ {
		return tok, fmt.Errorf("expected %v, got %v at line %d, column %d", typ, tok.Type, tok.Line, tok.Column)
	}
	return tok, nil
}

// parseOr handles OR expressions (lowest precedence)
func (p *Parser) parseOr() (Node, error) {
	left, err := p.parseAnd()
	if err != nil {
		return nil, err
	}

	for p.current().Type == TokenOr {
		p.advance() // consume OR
		right, err := p.parseAnd()
		if err != nil {
			return nil, err
		}
		left = &BinaryNode{Op: NodeOr, Left: left, Right: right}
	}

	return left, nil
}

// parseAnd handles AND expressions
func (p *Parser) parseAnd() (Node, error) {
	left, err := p.parseNot()
	if err != nil {
		return nil, err
	}

	for p.current().Type == TokenAnd {
		p.advance() // consume AND
		right, err := p.parseNot()
		if err != nil {
			return nil, err
		}
		left = &BinaryNode{Op: NodeAnd, Left: left, Right: right}
	}

	return left, nil
}

// parseNot handles NOT expressions
func (p *Parser) parseNot() (Node, error) {
	if p.current().Type == TokenNot {
		p.advance() // consume NOT
		child, err := p.parseNot()
		if err != nil {
			return nil, err
		}
		return &UnaryNode{Op: NodeNot, Child: child}, nil
	}

	return p.parseComparison()
}

// parseComparison handles comparison expressions
func (p *Parser) parseComparison() (Node, error) {
	left, err := p.parsePrimary()
	if err != nil {
		return nil, err
	}

	tok := p.current()
	switch tok.Type {
	case TokenEq:
		p.advance()
		right, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Op: NodeEquals, Left: left, Right: right}, nil

	case TokenNe:
		p.advance()
		right, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Op: NodeNotEquals, Left: left, Right: right}, nil

	case TokenGt:
		p.advance()
		right, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Op: NodeGreaterThan, Left: left, Right: right}, nil

	case TokenGe:
		p.advance()
		right, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Op: NodeGreaterThanOrEqual, Left: left, Right: right}, nil

	case TokenLt:
		p.advance()
		right, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Op: NodeLessThan, Left: left, Right: right}, nil

	case TokenLe:
		p.advance()
		right, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Op: NodeLessThanOrEqual, Left: left, Right: right}, nil

	case TokenLike:
		p.advance()
		right, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Op: NodeLike, Left: left, Right: right}, nil

	case TokenILike:
		p.advance()
		right, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Op: NodeILike, Left: left, Right: right}, nil

	case TokenIn:
		p.advance()
		values, err := p.parseList()
		if err != nil {
			return nil, err
		}
		return &InNode{Field: left, Values: values, Negate: false}, nil

	case TokenBetween:
		p.advance()
		min, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}
		// Expect AND
		if p.current().Type != TokenAnd {
			return nil, fmt.Errorf("expected AND after BETWEEN min value")
		}
		p.advance()
		max, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}

		var minVal, maxVal interface{}
		if minLit, ok := min.(*LiteralNode); ok {
			minVal = minLit.Value
		}
		if maxLit, ok := max.(*LiteralNode); ok {
			maxVal = maxLit.Value
		}

		return &RangeNode{Field: left, Min: minVal, Max: maxVal}, nil

	case TokenIdent:
		// Handle IS NULL / IS NOT NULL
		if strings.ToUpper(tok.Value) == "IS" {
			p.advance()
			nextTok := p.current()

			if nextTok.Type == TokenNot {
				p.advance()
				nullTok := p.current()
				if strings.ToUpper(nullTok.Value) == "NULL" {
					p.advance()
					return &UnaryNode{Op: NodeIsNotNull, Child: left}, nil
				}
				return nil, fmt.Errorf("expected NULL after IS NOT")
			}

			if strings.ToUpper(nextTok.Value) == "NULL" {
				p.advance()
				return &UnaryNode{Op: NodeIsNull, Child: left}, nil
			}

			return nil, fmt.Errorf("expected NULL or NOT NULL after IS")
		}

		// Handle NOT IN (as identifier)
		if strings.ToUpper(tok.Value) == "NOT" {
			p.advance()
			if p.current().Type == TokenIn {
				p.advance()
				values, err := p.parseList()
				if err != nil {
					return nil, err
				}
				return &InNode{Field: left, Values: values, Negate: true}, nil
			}
			// Not followed by IN, put back
			p.pos--
		}

	case TokenNot:
		// Handle NOT IN (as TokenNot)
		p.advance()
		if p.current().Type == TokenIn {
			p.advance()
			values, err := p.parseList()
			if err != nil {
				return nil, err
			}
			return &InNode{Field: left, Values: values, Negate: true}, nil
		}
		// Not followed by IN, put back
		p.pos--
	}

	return left, nil
}

// parsePrimary handles primary expressions (identifiers, literals, parenthesized expressions)
func (p *Parser) parsePrimary() (Node, error) {
	tok := p.current()

	switch tok.Type {
	case TokenLParen:
		p.advance() // consume (
		node, err := p.parseOr()
		if err != nil {
			return nil, err
		}
		_, err = p.expect(TokenRParen)
		if err != nil {
			return nil, err
		}
		return node, nil

	case TokenIdent:
		p.advance()
		return &FieldNode{Name: tok.Value}, nil

	case TokenString:
		p.advance()
		return &LiteralNode{Value: tok.Value}, nil

	case TokenNumber:
		p.advance()
		// Try to parse as int first, then float
		if strings.Contains(tok.Value, ".") {
			f, err := strconv.ParseFloat(tok.Value, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid number: %s", tok.Value)
			}
			return &LiteralNode{Value: f}, nil
		}
		i, err := strconv.ParseInt(tok.Value, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid number: %s", tok.Value)
		}
		return &LiteralNode{Value: i}, nil

	default:
		return nil, fmt.Errorf("unexpected token %v at line %d, column %d", tok.Type, tok.Line, tok.Column)
	}
}

// parseList parses a list of values like (1, 2, 3) or ['a', 'b', 'c']
func (p *Parser) parseList() ([]interface{}, error) {
	var values []interface{}

	// Expect opening paren or bracket
	tok := p.current()
	var closingToken TokenType
	if tok.Type == TokenLParen {
		closingToken = TokenRParen
	} else if tok.Type == TokenLBracket {
		closingToken = TokenRBracket
	} else {
		return nil, fmt.Errorf("expected ( or [ for list, got %v", tok.Type)
	}
	p.advance()

	// Parse values
	for p.current().Type != closingToken {
		if p.current().Type == TokenEOF {
			return nil, fmt.Errorf("unexpected end of input in list")
		}

		// Skip commas
		if p.current().Type == TokenComma {
			p.advance()
			continue
		}

		node, err := p.parsePrimary()
		if err != nil {
			return nil, err
		}

		if lit, ok := node.(*LiteralNode); ok {
			values = append(values, lit.Value)
		} else if field, ok := node.(*FieldNode); ok {
			// For things like IN (value1, value2) where values look like identifiers
			values = append(values, field.Name)
		} else {
			return nil, fmt.Errorf("unexpected node type in list")
		}
	}

	p.advance() // consume closing token
	return values, nil
}

// ParseQuery parses a query string into an AST
func ParseQuery(input string) (Node, error) {
	if input == "" {
		return nil, ErrEmptyQuery
	}

	lexer := NewLexer(input)
	tokens, err := lexer.Tokenize()
	if err != nil {
		return nil, err
	}

	parser := NewParser(tokens)
	return parser.Parse()
}

// ParseSimpleQuery parses a simple search query into a FullTextNode
// This is for basic keyword searches without complex operators
func ParseSimpleQuery(input string, fields []string) Node {
	if input == "" {
		return nil
	}
	return &FullTextNode{
		Query:  input,
		Fields: fields,
	}
}
