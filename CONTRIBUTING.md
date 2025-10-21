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

- Write tests for new features
- Maintain or improve existing test coverage
- Ensure all tests pass before submitting PR
- Include both unit and integration tests where appropriate

### Backend Tests
```bash
cd backend
go test ./...
```

### Frontend Tests
```bash
cd frontend
npm test
```

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
