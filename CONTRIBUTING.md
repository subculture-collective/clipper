# Contributing to Clipper

Thank you for your interest in contributing to Clipper! This document provides guidelines and instructions for contributing to the project.

## 🎯 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/clipper.git`
3. Add upstream remote: `git remote add upstream https://github.com/subculture-collective/clipper.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## 💻 Development Setup

Follow the setup instructions in the [README.md](README.md) to get your development environment running.

## 📋 Development Workflow

1. **Create a branch** from `main` for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style and conventions
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   make test
   make lint
   ```

4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Follow conventional commit format:
     ```
     type(scope): description
     
     [optional body]
     [optional footer]
     ```
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Example: `feat(clips): add clip search functionality`

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure all CI checks pass

## 🎨 Code Style

### Backend (Go)

- Follow standard Go conventions
- Use `gofmt` to format code
- Run `go vet` to check for common mistakes
- Write meaningful comments for exported functions
- Keep functions small and focused
- Use meaningful variable names

### Frontend (TypeScript/React)

- Follow TypeScript best practices
- Use functional components with hooks
- Follow React naming conventions
- Use ESLint for code consistency
- Write meaningful prop types
- Keep components small and reusable

## 🧪 Testing

All contributions must include appropriate tests. We maintain high test coverage standards:

- **Backend**: >80% overall (>90% services, >85% repository, >80% handlers)
- **Frontend**: >80% overall (>80% components, >90% hooks, >95% utilities)

See our [Testing Guide](docs/TESTING.md) for comprehensive testing documentation.

### Test Requirements

1. **Unit Tests** - Required for all new code
   - Test individual functions and methods
   - Mock external dependencies
   - Follow AAA pattern (Arrange, Act, Assert)

2. **Integration Tests** - Required for API endpoints and database operations
   - Test component interactions
   - Use test database via Docker
   - Clean up after tests

3. **E2E Tests** - Required for major user workflows
   - Test complete user journeys
   - Use Playwright for frontend E2E
   - Test across different browsers/devices

### Running Tests

```bash
# All tests
make test

# Unit tests only (fast)
make test-unit

# Integration tests (requires Docker)
make test-integration

# With coverage report
make test-coverage

# E2E tests
cd frontend && npm run test:e2e
```

### Backend Tests

```bash
cd backend

# Run all tests
go test ./...

# Run with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run specific package
go test ./internal/handlers/...

# Run with race detection
go test -race ./...
```

### Frontend Tests

```bash
cd frontend

# Run unit/integration tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

### Writing Good Tests

```go
// Backend example (Go)
func TestClipService_GetClip(t *testing.T) {
    // Arrange
    mockRepo := new(MockClipRepository)
    service := NewClipService(mockRepo)
    expectedClip := testutil.TestClip()
    mockRepo.On("GetByID", mock.Anything, expectedClip.ID).Return(expectedClip, nil)
    
    // Act
    clip, err := service.GetClip(context.Background(), expectedClip.ID)
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, expectedClip.Title, clip.Title)
    mockRepo.AssertExpectations(t)
}
```

```typescript
// Frontend example (TypeScript)
describe('ClipCard', () => {
  it('displays clip information correctly', () => {
    // Arrange
    const clip = mockClip();
    
    // Act
    render(<ClipCard clip={clip} />);
    
    // Assert
    expect(screen.getByText(clip.title)).toBeInTheDocument();
    expect(screen.getByText(clip.broadcaster_name)).toBeInTheDocument();
  });
});
```

### Test Coverage

Before submitting a PR:

1. Run tests with coverage: `make test-coverage`
2. Ensure your changes don't decrease overall coverage
3. New code should have >80% coverage
4. Fix any failing tests

The CI will automatically check coverage and fail if it drops below thresholds.

## 📝 Documentation

- Update README.md if you change functionality
- Document new API endpoints
- Add JSDoc/GoDoc comments for public APIs
- Update relevant documentation in `docs/` directory

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the behavior
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, Go version, Node version, etc.
6. **Screenshots**: If applicable
7. **Additional Context**: Any other relevant information

## 💡 Feature Requests

When suggesting features:

1. **Use Case**: Describe the problem you're trying to solve
2. **Proposed Solution**: Your suggested approach
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Any relevant information

## 🔍 Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] Commit messages follow conventional format
- [ ] No merge conflicts with main branch

### PR Description Template

```markdown
## Description
[Brief description of the changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
[Describe the tests you ran]

## Related Issues
Closes #[issue number]

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
```

## 🏷️ Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `question`: Further information requested

## 🎯 Priority Levels

- **P0 - Critical**: MVP blocker, must be done immediately
- **P1 - High**: Important for next release
- **P2 - Medium**: Should be done soon
- **P3 - Low**: Nice to have

## 📞 Getting Help

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Check existing documentation in `docs/` directory

## 🙏 Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!
