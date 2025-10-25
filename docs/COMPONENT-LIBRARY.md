# Clipper Component Library

A comprehensive, production-ready component library built with React, TypeScript, and TailwindCSS v4.

## 🎨 Features

- **🎯 Comprehensive Component Set**: 30+ production-ready components
- **🌓 Dark Mode Support**: Built-in theme system with light, dark, and system modes
- **♿ Accessible**: WCAG AA compliant with ARIA labels and keyboard navigation
- **📱 Responsive**: Mobile-first design with responsive breakpoints
- **⚡ Performance**: Optimized with React 19 and tree-shaking
- **🔧 TypeScript**: Fully typed with comprehensive interfaces
- **🎨 Customizable**: Extensive theming system with Tailwind
- **📦 Modular**: Import only what you need

## 📦 Components

### Layout Components

- **Container**: Max-width wrapper with responsive padding
- **Grid**: Responsive column system with gap utilities
- **Stack**: Flexbox-based vertical/horizontal layouts

### Form Components

- **Button**: Multiple variants (primary, secondary, ghost, danger, outline) with loading states
- **Input**: Text inputs with icons, error states, and helper text
- **TextArea**: Auto-resize option with character counter
- **Checkbox**: Custom styled with labels
- **Toggle**: Smooth animated switch component

### Feedback Components

- **Alert**: Success, warning, error, info variants with dismissible option
- **Modal**: Dialog with backdrop, focus trap, and animations
- **Spinner**: Multiple sizes and color options
- **Skeleton**: Loading placeholders with shimmer animation

### Data Display Components

- **Card**: Header, body, footer sections with hover effects
- **Badge**: Color variants and sizes for status/labels
- **Avatar**: Image with fallback and status indicators
- **Divider**: Horizontal/vertical with optional text label

## 🚀 Usage

### Basic Example

```tsx
import { Button, Input, Card, CardHeader, CardBody } from '@/components';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <h2>Login</h2>
      </CardHeader>
      <CardBody>
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
        />
        <Button variant="primary" fullWidth>
          Sign In
        </Button>
      </CardBody>
    </Card>
  );
}
```

### Theme System

```tsx
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button onClick={() => setTheme('dark')}>
      Toggle Dark Mode
    </Button>
  );
}
```

## 🎨 Design System

### Color Palette

- **Primary**: Twitch Purple (#9146FF) - Brand color
- **Secondary**: Complementary purple shades
- **Success**: Green variants for positive feedback
- **Warning**: Yellow/orange for warnings
- **Error**: Red variants for errors
- **Info**: Blue variants for informational content
- **Neutral**: Gray scale for backgrounds and text

### Typography

- System font stack with fallbacks
- Responsive font sizes (xs to 9xl)
- Consistent line heights and letter spacing
- Font weights from normal to bold

### Spacing & Layout

- Consistent spacing scale (0 to 96)
- Border radius scale (sm to full)
- Shadow system (sm to 2xl)
- Z-index layers for proper stacking

### Dark Mode

The theme system supports three modes:

- **Light**: Bright, high-contrast interface
- **Dark**: Reduced eye strain in low-light
- **System**: Matches OS preference

Theme preference is persisted in localStorage.

## 🔧 Component Props

### Button

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
}
```

### Input

```tsx
interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

### Card

```tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  clickable?: boolean;
  hover?: boolean;
}
```

## ♿ Accessibility

All components follow WCAG AA guidelines:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Color contrast compliance

### Keyboard Navigation

- **Tab**: Navigate through interactive elements
- **Enter/Space**: Activate buttons and toggles
- **Escape**: Close modals and dialogs
- **Arrow keys**: Navigate in select menus

## 📱 Responsive Design

All components are mobile-first and responsive:

- **sm**: ≥640px (tablets)
- **md**: ≥768px (small desktops)
- **lg**: ≥1024px (desktops)
- **xl**: ≥1280px (large desktops)

## 🔨 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # Basic UI components
│   │   ├── layout/      # Layout components
│   │   ├── common/      # Shared components
│   │   └── features/    # Feature-specific components
│   ├── context/         # React contexts (Theme, etc.)
│   ├── lib/            # Utility functions
│   ├── hooks/          # Custom hooks
│   └── types/          # TypeScript types
├── tailwind.config.js  # Tailwind configuration
├── postcss.config.js   # PostCSS configuration
└── vite.config.ts      # Vite configuration
```

## 🎯 Best Practices

### Component Usage

1. **Import efficiently**: Only import components you need
2. **Use TypeScript**: Leverage type safety for props
3. **Accessibility first**: Always include labels and ARIA attributes
4. **Responsive design**: Test components at all breakpoints
5. **Theme aware**: Use theme colors instead of hardcoded values

### Styling

1. **Use utility classes**: Leverage Tailwind's utility-first approach
2. **Custom components**: Use `cn()` utility for conditional classes
3. **Consistent spacing**: Follow the spacing scale
4. **Dark mode**: Test all components in both themes

## 📄 License

This component library is part of the Clipper project.

## 🤝 Contributing

Contributions are welcome! Please follow the project's contribution guidelines.

## 📚 Additional Resources

- [TailwindCSS Documentation](https://tailwindcss.com)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
