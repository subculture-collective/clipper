import { describe, it, expect } from 'vitest';
import {
    parseMarkdown,
    removeDoctocBlocks,
    processDataviewBlocks,
    generateTOC,
    headingToId,
    convertWikilinks,
    extractTextFromChildren,
} from './markdown-utils';

describe('markdown-utils', () => {
    describe('parseMarkdown', () => {
        it('should parse frontmatter and content', () => {
            const markdown = `---
title: Test Document
tags: [test, docs]
status: draft
---

# Test Heading

This is test content.`;

            const result = parseMarkdown(markdown);

            expect(result.frontmatter.title).toBe('Test Document');
            expect(result.frontmatter.tags).toEqual(['test', 'docs']);
            expect(result.frontmatter.status).toBe('draft');
            expect(result.content).toContain('# Test Heading');
        });
    });

    describe('removeDoctocBlocks', () => {
        it('should remove doctoc comment blocks', () => {
            const markdown = `# Title

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Section 1](#section-1)
- [Section 2](#section-2)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Section 1

Content here.`;

            const result = removeDoctocBlocks(markdown);

            expect(result).not.toContain('<!-- START doctoc');
            expect(result).not.toContain('<!-- END doctoc');
            expect(result).toContain('# Title');
            expect(result).toContain('# Section 1');
        });
    });

    describe('processDataviewBlocks', () => {
        it('should convert dataview blocks to callouts', () => {
            const markdown = `# Document

\`\`\`dataview
TABLE title, status
FROM "docs"
\`\`\`

More content.`;

            const result = processDataviewBlocks(markdown);

            expect(result).toContain('> [!note] Obsidian Dataview Query');
            expect(result).toContain('> This section uses Dataview queries');
            expect(result).not.toContain('```dataview\nTABLE');
        });
    });

    describe('generateTOC', () => {
        it('should generate TOC from headings', () => {
            const markdown = `# Main Title

## Section 1

### Subsection 1.1

## Section 2

Content here.`;

            const toc = generateTOC(markdown);

            expect(toc).toHaveLength(1); // Only h1
            expect(toc[0].text).toBe('Main Title');
            expect(toc[0].level).toBe(1);
            expect(toc[0].children).toHaveLength(2); // Two h2s
        });
    });

    describe('headingToId', () => {
        it('should convert heading text to anchor ID', () => {
            expect(headingToId('Getting Started')).toBe('getting-started');
            expect(headingToId('API & Authentication')).toBe('api-authentication');
            expect(headingToId('  Spaces   Around  ')).toBe('spaces-around');
        });
    });

    describe('convertWikilinks', () => {
        it('should convert wikilinks to markdown links', () => {
            const markdown = 'See [[backend/api]] for details.';
            const result = convertWikilinks(markdown);
            expect(result).toBe('See [backend/api](backend/api) for details.');
        });

        it('should handle wikilinks with aliases', () => {
            const markdown = 'Check the [[backend/api|API docs]].';
            const result = convertWikilinks(markdown);
            expect(result).toBe('Check the [API docs](backend/api).');
        });

        it('should handle wikilinks with anchors', () => {
            const markdown = 'See [[glossary#term]] for definition.';
            const result = convertWikilinks(markdown);
            expect(result).toBe('See [glossary#term](glossary#term) for definition.');
        });
    });

    describe('extractTextFromChildren', () => {
        it('should extract text from string', () => {
            expect(extractTextFromChildren('Hello World')).toBe('Hello World');
        });

        it('should extract text from array of strings', () => {
            expect(extractTextFromChildren(['Hello', ' ', 'World'])).toBe('Hello World');
        });

        it('should extract text from nested React elements', () => {
            const element = {
                props: {
                    children: ['Text with ', { props: { children: 'code' } }],
                },
            };
            expect(extractTextFromChildren(element)).toBe('Text with code');
        });
    });
});
