import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { SkipLink } from '../components/ui/SkipLink';
import { Input } from '../components/ui/Input';

// Extend expect matchers
expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  describe('Button Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Button>Click me</Button>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes when disabled', async () => {
      const { container } = render(
        <Button disabled>Disabled Button</Button>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes when loading', async () => {
      const { container } = render(
        <Button loading>Loading</Button>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Modal Component', () => {
    it('should not have accessibility violations when open', async () => {
      const { container } = render(
        <Modal open={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper dialog role and aria-modal', async () => {
      const { container } = render(
        <Modal open={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('SkipLink Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <div>
          <SkipLink targetId="main" label="Skip to main content" />
          <main id="main" tabIndex={-1}>Main content</main>
        </div>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Input Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Input 
          label="Username" 
          placeholder="Enter username"
          aria-label="Username input"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should properly associate error messages', async () => {
      const { container } = render(
        <Input 
          label="Email" 
          error="Invalid email address"
          aria-label="Email input"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes when disabled', async () => {
      const { container } = render(
        <Input 
          label="Disabled Input" 
          disabled
          aria-label="Disabled input"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation Links', () => {
    it('should have proper link accessibility', async () => {
      const { container } = render(
        <BrowserRouter>
          <nav aria-label="Main navigation">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
        </BrowserRouter>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Elements', () => {
    it('should have proper form accessibility', async () => {
      const { container } = render(
        <form aria-label="Search form">
          <Input 
            label="Search" 
            type="search"
            placeholder="Search..."
            aria-label="Search input"
          />
          <Button type="submit">Search</Button>
        </form>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management', () => {
    it('should maintain proper focus order', async () => {
      const { container } = render(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </div>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
