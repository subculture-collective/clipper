import React from 'react';
import { Modal } from './Modal';

interface MarkdownHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MARKDOWN_EXAMPLES = [
  {
    title: 'Bold',
    syntax: '**bold text**',
    example: 'This is **bold text**',
  },
  {
    title: 'Italic',
    syntax: '*italic text*',
    example: 'This is *italic text*',
  },
  {
    title: 'Strikethrough',
    syntax: '~~strikethrough~~',
    example: 'This is ~~strikethrough~~',
  },
  {
    title: 'Link',
    syntax: '[link text](url)',
    example: 'Check out [this link](https://example.com)',
  },
  {
    title: 'Quote',
    syntax: '> quoted text',
    example: '> This is a quote',
  },
  {
    title: 'Inline Code',
    syntax: '`code`',
    example: 'Use the `console.log()` function',
  },
  {
    title: 'Code Block',
    syntax: '```\ncode block\n```',
    example: '```javascript\nconst hello = "world";\n```',
  },
  {
    title: 'Heading',
    syntax: '# Heading',
    example: '# Heading 1\n## Heading 2\n### Heading 3',
  },
  {
    title: 'List',
    syntax: '- item\n- item',
    example: '- First item\n- Second item\n- Third item',
  },
  {
    title: 'Numbered List',
    syntax: '1. item\n2. item',
    example: '1. First item\n2. Second item\n3. Third item',
  },
];

export const MarkdownHelpModal: React.FC<MarkdownHelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Markdown Formatting Guide"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use markdown syntax to format your comments and make them more readable.
        </p>

        <div className="space-y-4">
          {MARKDOWN_EXAMPLES.map((item) => (
            <div key={item.title} className="space-y-1">
              <h4 className="font-semibold text-sm">{item.title}</h4>
              <div className="space-y-1">
                <div className="bg-muted rounded p-2">
                  <code className="text-xs font-mono">{item.syntax}</code>
                </div>
                <div className="text-xs text-muted-foreground">Example:</div>
                <div className="bg-muted rounded p-2">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{item.example}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold text-sm mb-2">Keyboard Shortcuts</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd> to submit</li>
            <li>• <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Escape</kbd> to cancel</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
