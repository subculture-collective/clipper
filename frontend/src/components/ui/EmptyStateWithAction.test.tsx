import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { EmptyStateWithAction } from './EmptyStateWithAction';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('EmptyStateWithAction', () => {
  it('renders title and description', () => {
    renderWithRouter(
      <EmptyStateWithAction
        title="Test Title"
        description="Test Description"
      />
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const icon = <svg data-testid="test-icon" />;
    renderWithRouter(
      <EmptyStateWithAction
        icon={icon}
        title="Test"
        description="Test"
      />
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders primary action button with href', () => {
    renderWithRouter(
      <EmptyStateWithAction
        title="Test"
        description="Test"
        primaryAction={{
          label: "Primary Action",
          href: "/test"
        }}
      />
    );
    
    const button = screen.getByText('Primary Action');
    expect(button).toBeInTheDocument();
    expect(button.closest('a')).toHaveAttribute('href', '/test');
  });

  it('renders primary action button with onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    renderWithRouter(
      <EmptyStateWithAction
        title="Test"
        description="Test"
        primaryAction={{
          label: "Click Me",
          onClick: handleClick
        }}
      />
    );
    
    const button = screen.getByText('Click Me');
    await user.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders secondary action button', () => {
    renderWithRouter(
      <EmptyStateWithAction
        title="Test"
        description="Test"
        secondaryAction={{
          label: "Secondary Action",
          href: "/secondary"
        }}
      />
    );
    
    const button = screen.getByText('Secondary Action');
    expect(button).toBeInTheDocument();
  });

  it('renders tips when provided', () => {
    const tips = [
      'First tip',
      'Second tip',
      'Third tip'
    ];
    
    renderWithRouter(
      <EmptyStateWithAction
        title="Test"
        description="Test"
        tips={tips}
      />
    );
    
    expect(screen.getByText('Helpful tips:')).toBeInTheDocument();
    tips.forEach(tip => {
      expect(screen.getByText(tip)).toBeInTheDocument();
    });
  });

  it('does not render tips section when tips array is empty', () => {
    renderWithRouter(
      <EmptyStateWithAction
        title="Test"
        description="Test"
        tips={[]}
      />
    );
    
    expect(screen.queryByText('Helpful tips:')).not.toBeInTheDocument();
  });

  it('renders both primary and secondary actions', () => {
    renderWithRouter(
      <EmptyStateWithAction
        title="Test"
        description="Test"
        primaryAction={{
          label: "Primary",
          href: "/primary"
        }}
        secondaryAction={{
          label: "Secondary",
          href: "/secondary"
        }}
      />
    );
    
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Secondary')).toBeInTheDocument();
  });
});
