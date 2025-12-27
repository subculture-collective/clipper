# Mobile App Documentation

This directory contains comprehensive documentation for the Clipper mobile app development.

## Available Guides

### [POINTER_EVENTS_GUIDE.md](./POINTER_EVENTS_GUIDE.md)
Complete guide for handling touch interactions in React Native 0.81+. Covers:
- ✅ Proper `pointerEvents` usage (style property vs deprecated prop)
- 📚 All four pointer event values (`auto`, `none`, `box-none`, `box-only`)
- 🎯 Common use cases (disabled states, overlays, nested interactions)
- 🧪 Testing strategies
- 🔧 NativeWind/Tailwind integration

**Read this before implementing any touch interaction logic.**

## Development Workflow

### Running Tests

After installing dependencies:

```bash
cd mobile
npm install
npm test
```

To run pointer events tests specifically:

```bash
npm test pointer-events
```

### Linting

Check code quality:

```bash
npm run lint
```

### Type Checking

Verify TypeScript types:

```bash
npm run type-check
```

## Best Practices

1. **Touch Interactions**: Always use `pointerEvents` in the `style` prop
2. **State Management**: Follow patterns in `ARCHITECTURE.md`
3. **Component Structure**: Keep components focused and testable
4. **Testing**: Write tests for interactive components
5. **Documentation**: Update docs when adding new patterns

## Verification Checklist

When implementing new features:

- [ ] Read relevant documentation
- [ ] Follow established patterns
- [ ] Write or update tests
- [ ] Run linter and type checker
- [ ] Test on both iOS and Android
- [ ] Update documentation if adding new patterns

## Questions?

If you need help:
1. Check existing documentation
2. Review similar implementations in the codebase
3. Ask the team or create an issue

---

Last Updated: December 2024
