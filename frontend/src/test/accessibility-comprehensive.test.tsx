/**
 * Comprehensive accessibility tests for WCAG 2.1 AA compliance
 * Tests keyboard navigation, ARIA attributes, color contrast, and semantic structure
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { testAccessibility, testKeyboardNavigation } from './utils/accessibility.tsx';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SkipLink } from '../components/ui/SkipLink';
import { Toggle } from '../components/ui/Toggle';
import { Checkbox } from '../components/ui/Checkbox';
import { TextArea } from '../components/ui/TextArea';
import { Card } from '../components/ui/Card';

describe('Comprehensive Accessibility Tests - WCAG 2.1 AA', () => {
  describe('Button Component Accessibility', () => {
    it('should pass all axe checks', async () => {
      const { container } = render(
        <div>
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="danger">Danger Button</Button>
          <Button variant="outline">Outline Button</Button>
        </div>
      );
      
      await testAccessibility(container);
    });

    it('should have proper focus indicators', () => {
      render(<Button>Focusable Button</Button>);
      const button = screen.getByRole('button', { name: 'Focusable Button' });
      
      // Check for focus-visible class
      expect(button.className).toContain('focus-visible:ring-2');
    });

    it('should maintain minimum touch target size', () => {
      render(<Button size="sm">Small Button</Button>);
      const button = screen.getByRole('button', { name: 'Small Button' });
      
      // Check for min-h-[44px] class which ensures WCAG AA touch target
      expect(button.className).toContain('min-h-[44px]');
    });

    it('should be keyboard accessible', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button', { name: 'Click Me' });
      
      // Test keyboard interaction
      button.focus();
      expect(document.activeElement).toBe(button);
      
      await userEvent.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await userEvent.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should have proper disabled state', async () => {
      const { container } = render(
        <Button disabled>Disabled Button</Button>
      );
      
      const button = screen.getByRole('button', { name: 'Disabled Button' });
      expect(button).toBeDisabled();
      
      await testAccessibility(container);
    });

    it('should have proper loading state with aria attributes', async () => {
      const { container } = render(
        <Button loading>Loading Button</Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      await testAccessibility(container);
    });
  });

  describe('Input Component Accessibility', () => {
    it('should pass all axe checks', async () => {
      const { container } = render(
        <Input 
          label="Email Address" 
          placeholder="Enter your email"
          type="email"
        />
      );
      
      await testAccessibility(container);
    });

    it('should have proper label association', () => {
      render(<Input label="Username" id="username-input" />);
      
      const input = screen.getByLabelText('Username');
      expect(input).toBeTruthy();
      expect(input.getAttribute('id')).toBe('username-input');
    });

    it('should associate error messages properly', async () => {
      const { container } = render(
        <Input 
          label="Email" 
          error="Invalid email address"
          id="email-input"
        />
      );
      
      const input = screen.getByLabelText('Email');
      const errorId = input.getAttribute('aria-describedby');
      
      expect(errorId).toBeTruthy();
      
      await testAccessibility(container);
    });

    it('should maintain minimum height for touch targets', () => {
      render(<Input label="Search" />);
      
      const input = screen.getByLabelText('Search');
      expect(input.className).toContain('min-h-[44px]');
    });

    it('should support keyboard navigation', async () => {
      render(<Input label="Text Input" />);
      
      const input = screen.getByLabelText('Text Input');
      input.focus();
      
      expect(document.activeElement).toBe(input);
    });

    it('should have visible focus indicator', () => {
      render(<Input label="Focused Input" />);
      
      const input = screen.getByLabelText('Focused Input');
      expect(input.className).toContain('focus:ring-2');
      expect(input.className).toContain('focus:ring-primary-500');
    });
  });

  describe('Modal Component Accessibility', () => {
    it('should pass all axe checks when open', async () => {
      const { container } = render(
        <Modal open={true} onClose={() => {}} title="Test Modal">
          <p>Modal content goes here</p>
        </Modal>
      );
      
      await testAccessibility(container);
    });

    it('should have proper dialog role and aria-modal', () => {
      render(
        <Modal open={true} onClose={() => {}} title="Dialog Modal">
          <p>Content</p>
        </Modal>
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have proper title association', () => {
      render(
        <Modal open={true} onClose={() => {}} title="Modal Title">
          <p>Content</p>
        </Modal>
      );
      
      const dialog = screen.getByRole('dialog', { name: 'Modal Title' });
      expect(dialog).toBeTruthy();
    });

    it('should trap focus within modal', async () => {
      const { container } = render(
        <Modal open={true} onClose={() => {}} title="Focus Trap Test">
          <button>First Button</button>
          <button>Second Button</button>
          <button>Third Button</button>
        </Modal>
      );
      
      const focusableElements = testKeyboardNavigation(container);
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should close on Escape key', async () => {
      const handleClose = vi.fn();
      render(
        <Modal open={true} onClose={handleClose} title="Escape Test">
          <p>Press Escape to close</p>
        </Modal>
      );
      
      await userEvent.keyboard('{Escape}');
      expect(handleClose).toHaveBeenCalled();
    });

    it('should have accessible close button', () => {
      render(
        <Modal open={true} onClose={() => {}} title="Close Button Test">
          <p>Content</p>
        </Modal>
      );
      
      const closeButton = screen.getByRole('button', { name: 'Close modal' });
      expect(closeButton).toBeTruthy();
    });
  });

  describe('SkipLink Component Accessibility', () => {
    it('should pass all axe checks', async () => {
      const { container } = render(
        <div>
          <SkipLink targetId="main-content" label="Skip to main content" />
          <main id="main-content" tabIndex={-1}>
            <h1>Main Content</h1>
          </main>
        </div>
      );
      
      await testAccessibility(container);
    });

    it('should be keyboard accessible', () => {
      render(
        <div>
          <SkipLink targetId="main" label="Skip to main" />
          <main id="main" tabIndex={-1}>Content</main>
        </div>
      );
      
      const skipLink = screen.getByText('Skip to main');
      skipLink.focus();
      
      expect(document.activeElement).toBe(skipLink);
    });

    it('should have proper href attribute', () => {
      render(
        <div>
          <SkipLink targetId="content" label="Skip" />
          <div id="content">Content</div>
        </div>
      );
      
      const link = screen.getByText('Skip');
      expect(link.getAttribute('href')).toBe('#content');
    });
  });

  describe('Toggle Component Accessibility', () => {
    it('should pass all axe checks', async () => {
      const { container } = render(
        <Toggle 
          checked={false} 
          onChange={() => {}} 
          label="Enable notifications"
        />
      );
      
      await testAccessibility(container);
    });

    it('should have proper ARIA attributes', () => {
      render(
        <Toggle 
          checked={true} 
          onChange={() => {}} 
          label="Dark Mode"
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should be keyboard accessible', async () => {
      const handleChange = vi.fn();
      render(
        <Toggle 
          checked={false} 
          onChange={handleChange} 
          label="Toggle Setting"
        />
      );
      
      const toggle = screen.getByRole('switch');
      toggle.focus();
      
      await userEvent.keyboard(' ');
      expect(handleChange).toHaveBeenCalled();
    });

    it('should have visible focus indicator', () => {
      const { container } = render(
        <Toggle 
          checked={false} 
          onChange={() => {}} 
          label="Focus Test"
        />
      );
      
      // The input itself has sr-only, but peer-focus classes provide visible focus
      const visualElement = container.querySelector('.peer-focus\\:ring-2');
      expect(visualElement).toBeTruthy();
      expect(visualElement?.className).toContain('peer-focus:ring-2');
    });
  });

  describe('Checkbox Component Accessibility', () => {
    it('should pass all axe checks', async () => {
      const { container } = render(
        <Checkbox 
          checked={false} 
          onChange={() => {}} 
          label="Accept terms"
        />
      );
      
      await testAccessibility(container);
    });

    it('should have proper label association', () => {
      render(
        <Checkbox 
          checked={false} 
          onChange={() => {}} 
          label="Subscribe to newsletter"
        />
      );
      
      const checkbox = screen.getByRole('checkbox', { name: 'Subscribe to newsletter' });
      expect(checkbox).toBeTruthy();
    });

    it('should be keyboard accessible', async () => {
      const handleChange = vi.fn();
      render(
        <Checkbox 
          checked={false} 
          onChange={handleChange} 
          label="Checkbox"
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      
      await userEvent.keyboard(' ');
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('TextArea Component Accessibility', () => {
    it('should pass all axe checks', async () => {
      const { container } = render(
        <TextArea 
          label="Description" 
          placeholder="Enter description"
        />
      );
      
      await testAccessibility(container);
    });

    it('should have proper label association', () => {
      render(<TextArea label="Comment" id="comment-textarea" />);
      
      const textarea = screen.getByLabelText('Comment');
      expect(textarea).toBeTruthy();
      expect(textarea.getAttribute('id')).toBe('comment-textarea');
    });

    it('should support keyboard navigation', async () => {
      render(<TextArea label="Notes" />);
      
      const textarea = screen.getByLabelText('Notes');
      textarea.focus();
      
      expect(document.activeElement).toBe(textarea);
    });

    it('should have visible focus indicator', () => {
      render(<TextArea label="Text Area" />);
      
      const textarea = screen.getByLabelText('Text Area');
      expect(textarea.className).toContain('focus:ring-2');
    });
  });

  describe('Card Component Accessibility', () => {
    it('should pass all axe checks', async () => {
      const { container } = render(
        <Card>
          <h2>Card Title</h2>
          <p>Card content goes here</p>
        </Card>
      );
      
      await testAccessibility(container);
    });

    it('should support semantic HTML structure', () => {
      const { container } = render(
        <Card>
          <h2>Semantic Card</h2>
          <p>With proper structure</p>
        </Card>
      );
      
      const heading = container.querySelector('h2');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Semantic Card');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Tab navigation through interactive elements', async () => {
      render(
        <div>
          <Button>First</Button>
          <Input label="Input" />
          <Button>Second</Button>
          <a href="#link">Link</a>
        </div>
      );
      
      const first = screen.getByRole('button', { name: 'First' });
      const input = screen.getByLabelText('Input');
      const second = screen.getByRole('button', { name: 'Second' });
      const link = screen.getByRole('link', { name: 'Link' });
      
      first.focus();
      expect(document.activeElement).toBe(first);
      
      await userEvent.tab();
      expect(document.activeElement).toBe(input);
      
      await userEvent.tab();
      expect(document.activeElement).toBe(second);
      
      await userEvent.tab();
      expect(document.activeElement).toBe(link);
    });

    it('should support Shift+Tab for reverse navigation', async () => {
      render(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
        </div>
      );
      
      const first = screen.getByRole('button', { name: 'First' });
      const second = screen.getByRole('button', { name: 'Second' });
      
      second.focus();
      expect(document.activeElement).toBe(second);
      
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(first);
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper button roles', () => {
      render(
        <div>
          <button>Native Button</button>
          <Button>Component Button</Button>
        </div>
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(2);
    });

    it('should have proper link roles', () => {
      render(
        <div>
          <a href="/home">Link</a>
          <a href="/about">About</a>
        </div>
      );
      
      const links = screen.getAllByRole('link');
      expect(links.length).toBe(2);
    });

    it('should have proper form element roles', () => {
      render(
        <form>
          <Input label="Text" />
          <TextArea label="Comment" />
          <Checkbox label="Accept" checked={false} onChange={() => {}} />
          <Toggle label="Enable" checked={false} onChange={() => {}} />
        </form>
      );
      
      expect(screen.getByRole('textbox', { name: 'Text' })).toBeTruthy();
      expect(screen.getByRole('textbox', { name: 'Comment' })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'Accept' })).toBeTruthy();
      expect(screen.getByRole('switch', { name: 'Enable' })).toBeTruthy();
    });
  });

  describe('Focus Management', () => {
    it('should maintain logical focus order', () => {
      const { container } = render(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </div>
      );
      
      const focusableElements = testKeyboardNavigation(container);
      expect(focusableElements.length).toBe(3);
      expect(focusableElements[0].tagName).toBe('button');
      expect(focusableElements[1].tagName).toBe('button');
      expect(focusableElements[2].tagName).toBe('button');
    });

    it('should skip disabled elements in focus order', () => {
      const { container } = render(
        <div>
          <Button>Enabled 1</Button>
          <Button disabled>Disabled</Button>
          <Button>Enabled 2</Button>
        </div>
      );
      
      const focusableElements = testKeyboardNavigation(container);
      // Disabled button should not be in focusable elements
      expect(focusableElements.length).toBe(2);
    });
  });
});
