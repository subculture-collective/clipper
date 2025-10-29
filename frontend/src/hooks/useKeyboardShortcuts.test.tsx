import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function TestComponent({ callback, enabled = true }: { callback: () => void; enabled?: boolean }) {
  useKeyboardShortcuts(
    [
      {
        key: '/',
        callback,
        description: 'Focus search',
      },
      {
        key: 'Escape',
        callback,
        description: 'Close menu',
      },
      {
        key: 'Ctrl+K',
        callback,
        description: 'Open command palette',
      },
    ],
    enabled
  );

  return (
    <div>
      <input placeholder="Search" />
      <button>Test</button>
    </div>
  );
}

describe('useKeyboardShortcuts', () => {
  it('triggers callback on key press', async () => {
    const callback = vi.fn();
    const user = userEvent.setup();
    
    render(<TestComponent callback={callback} />);
    
    await user.keyboard('/');
    
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('handles Escape key', async () => {
    const callback = vi.fn();
    const user = userEvent.setup();
    
    render(<TestComponent callback={callback} />);
    
    await user.keyboard('{Escape}');
    
    expect(callback).toHaveBeenCalled();
  });

  it('handles modifier keys', async () => {
    const callback = vi.fn();
    const user = userEvent.setup();
    
    render(<TestComponent callback={callback} />);
    
    await user.keyboard('{Control>}k{/Control}');
    
    expect(callback).toHaveBeenCalled();
  });

  it('does not trigger when typing in input', async () => {
    const callback = vi.fn();
    const user = userEvent.setup();
    
    render(<TestComponent callback={callback} />);
    
    const input = screen.getByPlaceholderText('Search');
    await user.click(input);
    
    // Typing in input should not trigger shortcuts (except Escape)
    await user.keyboard('abc');
    
    // The callback shouldn't be called for regular keys
    expect(callback).not.toHaveBeenCalled();
  });

  it('triggers Escape even when in input', async () => {
    const callback = vi.fn();
    const user = userEvent.setup();
    
    render(<TestComponent callback={callback} />);
    
    const input = screen.getByPlaceholderText('Search');
    await user.click(input);
    
    await user.keyboard('{Escape}');
    
    expect(callback).toHaveBeenCalled();
  });

  it('does not trigger when disabled', async () => {
    const callback = vi.fn();
    const user = userEvent.setup();
    
    render(<TestComponent callback={callback} enabled={false} />);
    
    await user.keyboard('/');
    await user.keyboard('{Escape}');
    
    expect(callback).not.toHaveBeenCalled();
  });
});
