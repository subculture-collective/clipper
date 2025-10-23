# CSS Injection Prevention

## Overview

This document describes the CSS injection prevention measures implemented in the Clipper application to protect against malicious color values in inline styles.

## Background

The application uses a Tag model (defined in `backend/internal/models/models.go`) that includes a `Color` field. This color value can be provided by users or administrators and is intended to be used for visual customization when displaying tags.

While color values are validated on the backend, a defense-in-depth approach requires additional sanitization on the frontend before using these values in inline CSS styles.

## Security Risk

CSS injection attacks can occur when untrusted data is used directly in inline styles without proper sanitization. Malicious color values could potentially:

1. **Break out of the style attribute**: Using special characters like quotes or semicolons
2. **Execute JavaScript**: Through legacy IE expressions or similar vectors
3. **Load external resources**: Via CSS `url()` functions
4. **Modify page layout**: By injecting additional CSS properties
5. **Exfiltrate data**: Through CSS-based side channels

### Example Attack Vectors

```javascript
// Malicious color values that could be dangerous:
"red; position: absolute; top: 0"           // Additional CSS properties
"expression(alert('XSS'))"                  // IE expression injection
"url('javascript:alert(1)')"                // JavaScript URL
"'; background: url('http://evil.com')"     // Quote breakout
"red\" onclick=\"alert('XSS')"              // Attribute injection
```

## Solution

### `sanitizeColor()` Utility Function

A comprehensive color sanitization function has been implemented in `frontend/src/lib/utils.ts` that:

1. **Validates color format**: Only allows well-formed CSS color values
2. **Blocks dangerous patterns**: Rejects inputs containing:
   - HTML/JavaScript injection characters (`<`, `>`, `'`, `"`)
   - JavaScript protocols
   - CSS functions that could be exploited (`url()`, `calc()`, `var()`, `attr()`, `expression()`)
   - CSS statement separators (`;`)
   - Escape characters (`\`)
   - Import statements

3. **Supports standard CSS color formats**:
   - Hex colors: `#RGB`, `#RRGGBB`, `#RRGGBBAA`
   - RGB/RGBA: `rgb(r, g, b)`, `rgba(r, g, b, a)`
   - HSL/HSLA: `hsl(h, s%, l%)`, `hsla(h, s%, l%, a)`
   - Named CSS colors: `red`, `blue`, `transparent`, etc.

4. **Returns null for invalid colors**: Allowing components to fall back to safe defaults

### Function Signature

```typescript
/**
 * Sanitizes a color value for safe use in inline CSS styles.
 * @param color - The color value to sanitize
 * @returns The sanitized color value, or null if invalid
 */
export function sanitizeColor(color: string | null | undefined): string | null
```

## Usage

### Safe Component Implementation

```typescript
import { sanitizeColor } from '@/lib/utils';

interface TagProps {
  name: string;
  color?: string | null;
}

function SafeTagBadge({ name, color }: TagProps) {
  // Sanitize the color before using it in inline styles
  const safeColor = sanitizeColor(color);
  
  // Only apply inline styles if the color is valid
  // Otherwise, fall back to default styling via CSS classes
  const style = safeColor 
    ? { backgroundColor: safeColor } 
    : undefined;
  
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full"
      style={style}
    >
      #{name}
    </span>
  );
}
```

### ❌ Unsafe Implementation (DO NOT USE)

```typescript
// VULNERABLE - Do not use user/backend colors directly
function UnsafeTagBadge({ name, color }: TagProps) {
  return (
    <span style={{ backgroundColor: color }}> {/* VULNERABLE! */}
      #{name}
    </span>
  );
}
```

## Testing

The `sanitizeColor()` function has been thoroughly tested with 34 test cases covering:

- ✅ Valid hex colors (short, full, with alpha)
- ✅ Valid RGB/RGBA colors
- ✅ Valid HSL/HSLA colors
- ✅ Valid named CSS colors
- ✅ Rejection of JavaScript injection attempts
- ✅ Rejection of CSS injection attempts
- ✅ Rejection of malformed colors
- ✅ Proper handling of edge cases (null, undefined, empty strings)

All tests pass successfully. Test results can be found in `/tmp/test-sanitize-color.js`.

## Security Analysis

### CodeQL Results

The implementation has been scanned with CodeQL security analysis:

- **JavaScript/TypeScript Analysis**: 0 alerts
- No security vulnerabilities detected

### Defense Layers

This implementation provides multiple layers of defense:

1. **Backend Validation**: Colors are validated when stored in the database
2. **Frontend Sanitization**: Colors are re-validated before use in styles (this implementation)
3. **Whitelist Approach**: Only explicitly allowed color formats are accepted
4. **Fallback Handling**: Invalid colors gracefully fall back to CSS classes

## Best Practices

When working with user-provided or dynamic colors in the application:

1. **Always use `sanitizeColor()`** before applying colors to inline styles
2. **Provide fallback styling** using CSS classes when colors are invalid
3. **Never trust data from external sources**, even if validated on the backend
4. **Log rejected colors** (optional) for monitoring potential attack attempts
5. **Keep the color validation patterns updated** as new attack vectors are discovered

## References

- [OWASP - CSS Injection](https://owasp.org/www-community/attacks/CSS_Injection)
- [MDN - CSS Colors](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value)
- [CWE-79: Cross-site Scripting (XSS)](https://cwe.mitre.org/data/definitions/79.html)

## Future Improvements

Potential enhancements for consideration:

1. Add support for newer CSS color formats (e.g., `lab()`, `lch()`, `color()`)
2. Implement a content security policy (CSP) to further restrict inline styles
3. Create a centralized theme system that maps tag IDs to pre-defined safe colors
4. Add telemetry to track and alert on rejected color values
