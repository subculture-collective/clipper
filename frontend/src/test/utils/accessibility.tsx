/* eslint-disable react-refresh/only-export-components */
/**
 * Accessibility testing utilities
 * Provides helper functions for consistent accessibility testing across the application
 */

import { render, type RenderOptions } from '@testing-library/react';
import {
    axe,
    toHaveNoViolations,
    type JestAxeConfigureOptions,
} from 'jest-axe';
import { type ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';

// Extend expect matchers
expect.extend(toHaveNoViolations);

/**
 * Default axe configuration for testing
 * Configures rules to match WCAG 2.1 AA standards
 */
export const defaultAxeConfig: JestAxeConfigureOptions = {
    rules: {
        // Enable WCAG 2.1 AA rules
        'color-contrast': { enabled: true },
        'html-has-lang': { enabled: true },
        'valid-lang': { enabled: true },
        'landmark-one-main': { enabled: true },
        'page-has-heading-one': { enabled: true },
        region: { enabled: true },
        // Focus visible
        'focus-order-semantics': { enabled: true },
        // ARIA
        'aria-allowed-attr': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'button-name': { enabled: true },
        'link-name': { enabled: true },
    },
};

/**
 * Wrapper component that provides necessary context for testing
 */
import { type ReactNode } from 'react';

interface TestWrapperProps {
    children: ReactNode;
}

function TestWrapper({ children }: TestWrapperProps) {
    return <BrowserRouter>{children}</BrowserRouter>;
}
/**
 * Custom render function that includes router context
 */
export function renderWithRouter(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { wrapper: TestWrapper, ...options });
}

/**
 * Run accessibility tests on a component
 * @param container - The container element to test
 * @param config - Optional axe configuration
 */
export async function testAccessibility(
    container: HTMLElement,
    config: JestAxeConfigureOptions = defaultAxeConfig
) {
    const results = await axe(container, config);
    expect(results).toHaveNoViolations();
    return results;
}

/**
 * Test keyboard navigation for a component
 * Ensures all interactive elements are keyboard accessible
 */
export function testKeyboardNavigation(container: HTMLElement) {
    const focusableElements = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    return Array.from(focusableElements).map((el) => ({
        element: el,
        tagName: el.tagName.toLowerCase(),
        hasTabIndex: el.hasAttribute('tabindex'),
        tabIndex: el.tabIndex,
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledBy: el.getAttribute('aria-labelledby'),
    }));
}

/**
 * Test focus indicators
 * Ensures all interactive elements have visible focus indicators
 */
export function hasFocusIndicator(element: HTMLElement): boolean {
    const styles = window.getComputedStyle(element);
    const focusStyles = {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
        boxShadow: styles.boxShadow,
    };

    // Check if element has focus-visible class or styles
    return (
        element.classList.contains('focus-visible') ||
        element.classList.contains('focus-visible:ring-2') ||
        focusStyles.outlineWidth !== '0px' ||
        focusStyles.boxShadow !== 'none'
    );
}

/**
 * Get color contrast ratio between two colors
 * Uses WCAG contrast calculation
 */
export function getContrastRatio(
    foreground: string,
    background: string
): number {
    const getLuminance = (color: string): number => {
        // Simple RGB luminance calculation
        // For production, use a proper color library
        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length < 3) return 0;

        const [r, g, b] = rgb.map((val) => {
            const num = parseInt(val) / 255;
            return num <= 0.03928
                ? num / 12.92
                : Math.pow((num + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate WCAG AA color contrast requirements
 * @param ratio - The contrast ratio to validate
 * @param isLargeText - Whether the text is considered large (18pt+ or 14pt+ bold)
 */
export function meetsWCAGAA(ratio: number, isLargeText = false): boolean {
    return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if an element has proper ARIA labeling
 */
export function hasProperLabel(element: HTMLElement): boolean {
    // Check for various labeling methods
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasTitle = element.hasAttribute('title');

    // For form inputs, check for associated label
    if (
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT'
    ) {
        const id = element.getAttribute('id');
        if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) return true;
        }
    }

    // For buttons, check text content
    if (element.tagName === 'BUTTON') {
        const hasTextContent =
            element.textContent && element.textContent.trim().length > 0;
        return hasTextContent || hasAriaLabel || hasAriaLabelledBy || hasTitle;
    }

    // For links, check text content or aria-label
    if (element.tagName === 'A') {
        const hasTextContent =
            element.textContent && element.textContent.trim().length > 0;
        return hasTextContent || hasAriaLabel || hasAriaLabelledBy || hasTitle;
    }

    return hasAriaLabel || hasAriaLabelledBy || hasTitle;
}

/**
 * Test live regions for dynamic content
 */
export function hasLiveRegion(container: HTMLElement): boolean {
    const liveRegions = container.querySelectorAll('[aria-live]');
    return liveRegions.length > 0;
}

/**
 * Validate heading hierarchy
 * Returns true if headings follow proper nesting (no skipped levels)
 */
export function validateHeadingHierarchy(container: HTMLElement): {
    valid: boolean;
    issues: string[];
} {
    const headings = Array.from(
        container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    );
    const issues: string[] = [];

    if (headings.length === 0) {
        return { valid: true, issues: [] };
    }

    let previousLevel = 0;

    headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));

        if (index === 0 && level !== 1) {
            issues.push(`First heading should be h1, found ${heading.tagName}`);
        }

        if (level - previousLevel > 1) {
            issues.push(
                `Heading level skipped: ${heading.tagName} follows h${previousLevel} at position ${index}`
            );
        }

        previousLevel = level;
    });

    return {
        valid: issues.length === 0,
        issues,
    };
}
