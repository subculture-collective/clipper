import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DateRangeSelector from './DateRangeSelector';

describe('DateRangeSelector - Accessibility', () => {
  it('renders without errors', () => {
    render(<DateRangeSelector value={30} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '30 Days' })).toBeInTheDocument();
  });

  it('has proper role="group" and aria-label', () => {
    render(<DateRangeSelector value={30} onChange={() => {}} />);

    const group = screen.getByRole('group', { name: /date range selection/i });
    expect(group).toBeInTheDocument();
  });

  it('uses aria-pressed to indicate selected state', () => {
    render(<DateRangeSelector value={30} onChange={() => {}} />);

    const button30Days = screen.getByRole('button', { name: '30 Days' });
    expect(button30Days).toHaveAttribute('aria-pressed', 'true');

    const button7Days = screen.getByRole('button', { name: '7 Days' });
    expect(button7Days).toHaveAttribute('aria-pressed', 'false');
  });

  it('has focus indicators on buttons', () => {
    render(<DateRangeSelector value={30} onChange={() => {}} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      const classes = button.className;
      expect(classes).toContain('focus:ring');
    });
  });

  it('calls onChange with correct value when clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<DateRangeSelector value={30} onChange={handleChange} />);

    const button7Days = screen.getByRole('button', { name: '7 Days' });
    await user.click(button7Days);

    expect(handleChange).toHaveBeenCalledWith(7);
  });

  it('allows keyboard navigation', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<DateRangeSelector value={30} onChange={handleChange} />);

    const button7Days = screen.getByRole('button', { name: '7 Days' });
    button7Days.focus();
    
    await user.keyboard('{Enter}');
    expect(handleChange).toHaveBeenCalledWith(7);

    handleChange.mockClear();
    await user.keyboard(' '); // Space key
    expect(handleChange).toHaveBeenCalledWith(7);
  });

  it('renders custom options when provided', () => {
    const customOptions = [
      { label: '1 Day', value: 1 },
      { label: '14 Days', value: 14 },
    ];

    render(
      <DateRangeSelector
        value={1}
        onChange={() => {}}
        options={customOptions}
      />
    );

    expect(screen.getByRole('button', { name: '1 Day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '14 Days' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '30 Days' })
    ).not.toBeInTheDocument();
  });
});
