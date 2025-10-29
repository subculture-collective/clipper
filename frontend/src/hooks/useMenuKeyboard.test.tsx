import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useMenuKeyboard } from './useMenuKeyboard';

function TestMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { menuRef } = useMenuKeyboard(isOpen, () => setIsOpen(false), 3);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Menu</button>
      {isOpen && (
        <div ref={menuRef} role="menu" data-testid="menu">
          <button role="menuitem" onClick={() => setIsOpen(false)}>Item 1</button>
          <button role="menuitem" onClick={() => setIsOpen(false)}>Item 2</button>
          <button role="menuitem" onClick={() => setIsOpen(false)}>Item 3</button>
        </div>
      )}
    </div>
  );
}

describe('useMenuKeyboard', () => {
  it('closes menu on Escape key', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    
    const openButton = screen.getByText('Open Menu');
    await user.click(openButton);
    
    expect(screen.getByTestId('menu')).toBeInTheDocument();
    
    await user.keyboard('{Escape}');
    
    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();
  });

  it('navigates with arrow keys', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    
    const openButton = screen.getByText('Open Menu');
    await user.click(openButton);
    
    // Arrow down should focus next item
    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('Item 1')).toHaveFocus();
    
    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('Item 2')).toHaveFocus();
    
    // Arrow up should focus previous item
    await user.keyboard('{ArrowUp}');
    expect(screen.getByText('Item 1')).toHaveFocus();
  });

  it('wraps navigation at boundaries', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    
    const openButton = screen.getByText('Open Menu');
    await user.click(openButton);
    
    // Navigate to last item
    await user.keyboard('{End}');
    expect(screen.getByText('Item 3')).toHaveFocus();
    
    // Arrow down should wrap to first
    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('Item 1')).toHaveFocus();
    
    // Arrow up should wrap to last
    await user.keyboard('{ArrowUp}');
    expect(screen.getByText('Item 3')).toHaveFocus();
  });

  it('supports Home and End keys', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    
    const openButton = screen.getByText('Open Menu');
    await user.click(openButton);
    
    await user.keyboard('{Home}');
    expect(screen.getByText('Item 1')).toHaveFocus();
    
    await user.keyboard('{End}');
    expect(screen.getByText('Item 3')).toHaveFocus();
  });

  it('activates item with Enter key', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    
    const openButton = screen.getByText('Open Menu');
    await user.click(openButton);
    
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    
    // Menu should close after activating item
    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();
  });
});
