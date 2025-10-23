/**
 * Example demonstrating the use of sanitizeColor for safe inline styles
 * 
 * This example shows how to use the sanitizeColor utility function to prevent
 * CSS injection attacks when rendering user-provided or backend-provided colors
 * in inline styles.
 */

import { sanitizeColor } from '@/lib/utils';

/**
 * Example Tag component that safely renders a tag with a custom color
 * This would be used when the Tag model's color field is rendered
 */
interface TagProps {
  name: string;
  color?: string | null;
}

export function SafeTagBadge({ name, color }: TagProps) {
  // Sanitize the color before using it in inline styles
  const safeColor = sanitizeColor(color);
  
  // Only apply inline styles if the color is valid
  // Otherwise, fall back to default styling via CSS classes
  const style = safeColor 
    ? { backgroundColor: safeColor } 
    : undefined;
  
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium"
      style={style}
    >
      #{name}
    </span>
  );
}

/**
 * Example showing various safe color inputs
 */
export function ColorSanitizationExamples() {
  const examples = [
    { name: 'Gaming', color: '#ff0000' },
    { name: 'Music', color: 'rgb(0, 128, 255)' },
    { name: 'Sports', color: 'hsl(120, 100%, 50%)' },
    { name: 'News', color: 'blue' },
    { name: 'Safe Default', color: null }, // Falls back to CSS class styling
    { name: 'Invalid Color', color: 'javascript:alert(1)' }, // Rejected by sanitizer
  ];

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-xl font-bold mb-4">Safe Color Usage Examples</h2>
      <div className="flex flex-wrap gap-2">
        {examples.map((example, index) => (
          <SafeTagBadge key={index} {...example} />
        ))}
      </div>
    </div>
  );
}

/**
 * Example of unsafe usage (DON'T DO THIS)
 * 
 * // UNSAFE - Do not use user/backend colors directly in inline styles
 * function UnsafeTagBadge({ name, color }: TagProps) {
 *   return (
 *     <span style={{ backgroundColor: color }}> // ❌ VULNERABLE TO CSS INJECTION
 *       #{name}
 *     </span>
 *   );
 * }
 * 
 * // SAFE - Always sanitize colors before using in inline styles
 * function SafeTagBadge({ name, color }: TagProps) {
 *   const safeColor = sanitizeColor(color); // ✓ PROTECTED
 *   return (
 *     <span style={safeColor ? { backgroundColor: safeColor } : undefined}>
 *       #{name}
 *     </span>
 *   );
 * }
 */
