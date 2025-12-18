import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageContent } from './MessageContent';

describe('MessageContent', () => {
  it('renders plain text content', () => {
    render(<MessageContent content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders mentions with proper styling', () => {
    render(<MessageContent content="Hello @user123" />);
    const mention = screen.getByText('@user123');
    expect(mention).toBeInTheDocument();
    expect(mention.className).toContain('text-primary-600');
    expect(mention.className).toContain('dark:text-primary-400');
  });

  it('renders URLs as links', () => {
    render(<MessageContent content="Check out https://example.com" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders inline code blocks', () => {
    render(<MessageContent content="Use `console.log()` for debugging" />);
    const code = screen.getByText('console.log()');
    expect(code.tagName).toBe('CODE');
    expect(code.className).toContain('bg-neutral-100');
    expect(code.className).toContain('dark:bg-neutral-800');
  });

  it('renders multi-line code blocks', () => {
    render(<MessageContent content="```const x = 1;```" />);
    const code = screen.getByText('const x = 1;');
    expect(code.tagName).toBe('CODE');
    expect(code.parentElement?.tagName).toBe('PRE');
  });

  it('handles mixed content with mentions and links', () => {
    render(<MessageContent content="Hey @user check https://example.com" />);
    expect(screen.getByText('@user')).toBeInTheDocument();
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});
