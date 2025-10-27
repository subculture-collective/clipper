import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/**
 * Utility function to merge Tailwind CSS classes
 * Uses clsx for conditional classes and tailwind-merge to resolve conflicts
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
/**
 * List of valid CSS color names
 * Based on standard CSS3/CSS4 color keywords
 */
const CSS_COLOR_NAMES = new Set([
    'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
    'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
    'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
    'darkgoldenrod', 'darkgray', 'darkgrey', 'darkgreen', 'darkkhaki', 'darkmagenta',
    'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
    'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
    'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
    'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'grey', 'green',
    'greenyellow', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
    'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
    'lightgoldenrodyellow', 'lightgray', 'lightgrey', 'lightgreen', 'lightpink', 'lightsalmon',
    'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
    'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
    'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
    'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
    'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
    'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
    'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
    'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
    'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
    'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
    'whitesmoke', 'yellow', 'yellowgreen', 'transparent'
]);
/**
 * Sanitizes a color value for safe use in inline CSS styles.
 *
 * This provides defense-in-depth against CSS injection attacks by validating
 * that color values conform to expected CSS color formats.
 *
 * Supported formats:
 * - Hex colors: #RGB, #RRGGBB, #RRGGBBAA
 * - RGB/RGBA: rgb(r, g, b), rgba(r, g, b, a)
 * - HSL/HSLA: hsl(h, s%, l%), hsla(h, s%, l%, a)
 * - Named CSS colors (e.g., 'red', 'blue', 'transparent')
 *
 * @param color - The color value to sanitize
 * @returns The sanitized color value, or null if invalid
 *
 * @example
 * sanitizeColor('#ff0000') // '#ff0000'
 * sanitizeColor('rgb(255, 0, 0)') // 'rgb(255, 0, 0)'
 * sanitizeColor('red') // 'red'
 * sanitizeColor('javascript:alert(1)') // null
 * sanitizeColor('expression(alert(1))') // null
 */
export function sanitizeColor(color) {
    if (!color || typeof color !== 'string') {
        return null;
    }
    // Trim and convert to lowercase for validation
    const trimmedColor = color.trim().toLowerCase();
    // Reject empty strings
    if (trimmedColor === '') {
        return null;
    }
    // Check for dangerous patterns that could be used for CSS injection
    const dangerousPatterns = [
        /[<>'"]/, // HTML/JS injection characters
        /javascript:/i, // JavaScript protocol
        /expression\(/i, // IE expression()
        /import/i, // CSS @import
        /url\(/i, // CSS url() - could load external resources
        /var\(/i, // CSS variables could be used for injection
        /calc\(/i, // CSS calc could be used for injection
        /attr\(/i, // CSS attr could be used for injection
        /;/, // CSS statement separator
        /\\/, // Backslash escaping
    ];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmedColor)) {
            return null;
        }
    }
    // Validate hex color format (#RGB, #RRGGBB, #RRGGBBAA)
    const hexPattern = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/;
    if (hexPattern.test(trimmedColor)) {
        return trimmedColor;
    }
    // Validate rgb/rgba format
    const rgbPattern = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+)\s*)?\)$/;
    const rgbMatch = trimmedColor.match(rgbPattern);
    if (rgbMatch) {
        const [, r, g, b, a] = rgbMatch;
        // Validate RGB values are in range 0-255
        const rVal = parseInt(r, 10);
        const gVal = parseInt(g, 10);
        const bVal = parseInt(b, 10);
        if (rVal <= 255 && gVal <= 255 && bVal <= 255) {
            // Validate alpha if present (0-1)
            if (a !== undefined) {
                const aVal = parseFloat(a);
                if (aVal >= 0 && aVal <= 1) {
                    return trimmedColor;
                }
            }
            else {
                return trimmedColor;
            }
        }
        return null;
    }
    // Validate hsl/hsla format
    const hslPattern = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*(0|1|0?\.\d+)\s*)?\)$/;
    const hslMatch = trimmedColor.match(hslPattern);
    if (hslMatch) {
        const [, h, s, l, a] = hslMatch;
        // Validate HSL values are in range
        const hVal = parseInt(h, 10);
        const sVal = parseInt(s, 10);
        const lVal = parseInt(l, 10);
        if (hVal <= 360 && sVal <= 100 && lVal <= 100) {
            // Validate alpha if present (0-1)
            if (a !== undefined) {
                const aVal = parseFloat(a);
                if (aVal >= 0 && aVal <= 1) {
                    return trimmedColor;
                }
            }
            else {
                return trimmedColor;
            }
        }
        return null;
    }
    // Validate named CSS colors
    if (CSS_COLOR_NAMES.has(trimmedColor)) {
        return trimmedColor;
    }
    // If none of the patterns match, reject the color
    return null;
}
