import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useFocusTrap } from './useFocusTrap';

function TestComponent() {
  const [isActive, setIsActive] = useState(false);
  const ref = useFocusTrap<HTMLDivElement>(isActive);

  return (
    <div>
      <button onClick={() => setIsActive(true)}>Open</button>
      {isActive && (
        <div ref={ref} data-testid="trap-container">
          <button>First</button>
          <button>Second</button>
          <button onClick={() => setIsActive(false)}>Close</button>
        </div>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('attaches ref to container', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    
    const openButton = screen.getByText('Open');
    await user.click(openButton);
    
    const container = screen.getByTestId('trap-container');
    expect(container).toBeInTheDocument();
  });

  it('renders focusable elements within trap', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    
    const openButton = screen.getByText('Open');
    await user.click(openButton);
    
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('allows tabbing through elements', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    
    const openButton = screen.getByText('Open');
    await user.click(openButton);
    
    // Focus first button
    const firstButton = screen.getByText('First');
    firstButton.focus();
    expect(firstButton).toHaveFocus();
    
    // Tab to second
    await user.tab();
    expect(screen.getByText('Second')).toHaveFocus();
    
    // Tab to close
    await user.tab();
    expect(screen.getByText('Close')).toHaveFocus();
  });

  it('closes and removes trap container', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    
    const openButton = screen.getByText('Open');
    await user.click(openButton);
    
    expect(screen.getByTestId('trap-container')).toBeInTheDocument();
    
    const closeButton = screen.getByText('Close');
    await user.click(closeButton);
    
    expect(screen.queryByTestId('trap-container')).not.toBeInTheDocument();
  });
});
