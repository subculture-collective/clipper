# Component Library

This directory contains all reusable UI components for the Clipper application.

## Directory Structure

```
components/
├── ui/              # Basic UI components (Button, Input, Card, etc.)
├── layout/          # Layout components (Container, Grid, Stack)
├── common/          # Shared components across features
└── features/        # Feature-specific components
```

## Usage

Import components from the main components index:

```tsx
import { Button, Input, Card } from '@/components';
```

Or import directly from specific directories:

```tsx
import { Button } from '@/components/ui';
import { Container } from '@/components/layout';
```

## Available Components

### UI Components
- Alert
- Avatar
- Badge
- Button
- Card (with CardHeader, CardBody, CardFooter)
- Checkbox
- Divider
- Input
- Modal (with ModalFooter)
- Skeleton
- Spinner
- TextArea
- Toggle

### Layout Components
- Container
- Grid
- Stack

## Adding New Components

When creating a new component:

1. Create the component file in the appropriate directory
2. Export it from the directory's `index.ts`
3. Add TypeScript interfaces for props
4. Include JSDoc comments for documentation
5. Ensure accessibility (ARIA labels, keyboard navigation)
6. Test in both light and dark modes
7. Make it responsive

Example component template:

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Component variant
   * @default 'default'
   */
  variant?: 'default' | 'primary';
  children: React.ReactNode;
}

/**
 * MyComponent description
 */
export const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('base-classes', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MyComponent.displayName = 'MyComponent';
```

## Styling Guidelines

- Use Tailwind utility classes
- Follow mobile-first responsive design
- Support dark mode with `dark:` variants
- Use the `cn()` utility for conditional classes
- Follow the design system color palette
- Use semantic color variables (e.g., `text-foreground`, `bg-background`)

## Accessibility Checklist

- [ ] Semantic HTML elements
- [ ] ARIA labels where needed
- [ ] Keyboard navigation support
- [ ] Focus indicators
- [ ] Screen reader compatibility
- [ ] Color contrast (WCAG AA)
- [ ] Error messages associated with form fields

## Testing Components

Always test your components:
- In light and dark modes
- At all responsive breakpoints (mobile, tablet, desktop)
- With keyboard navigation
- With screen readers (if possible)
- In different states (disabled, loading, error, etc.)
