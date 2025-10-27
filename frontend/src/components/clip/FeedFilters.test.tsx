import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedFilters } from './FeedFilters';
import type { SortOption } from '@/types/clip';

describe('FeedFilters', () => {
  const mockOnSortChange = vi.fn();
  const mockOnTimeframeChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Sort options rendering', () => {
    it('renders all sort options', () => {
      render(
        <FeedFilters
          sort="hot"
          onSortChange={mockOnSortChange}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      expect(screen.getByRole('button', { name: 'Hot' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Top' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rising' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Discussed' })).toBeInTheDocument();
    });

    it('applies primary variant to selected sort option', () => {
      render(
        <FeedFilters
          sort="hot"
          onSortChange={mockOnSortChange}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      const hotButton = screen.getByRole('button', { name: 'Hot' });
      const newButton = screen.getByRole('button', { name: 'New' });

      // Selected button should have primary variant classes
      expect(hotButton.className).toContain('bg-primary-500');
      expect(hotButton.className).toContain('text-white');
      
      // Unselected button should have ghost variant classes
      expect(newButton.className).toContain('bg-transparent');
    });

    it('applies primary variant to different selected sort', () => {
      render(
        <FeedFilters
          sort="new"
          onSortChange={mockOnSortChange}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      const hotButton = screen.getByRole('button', { name: 'Hot' });
      const newButton = screen.getByRole('button', { name: 'New' });

      // Now 'new' should be selected with primary variant
      expect(newButton.className).toContain('bg-primary-500');
      expect(newButton.className).toContain('text-white');
      
      // 'hot' should be unselected with ghost variant
      expect(hotButton.className).toContain('bg-transparent');
    });
  });

  describe('Sort option interaction', () => {
    it('calls onSortChange when clicking a sort option', async () => {
      const user = userEvent.setup();
      render(
        <FeedFilters
          sort="hot"
          onSortChange={mockOnSortChange}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      const newButton = screen.getByRole('button', { name: 'New' });
      await user.click(newButton);

      expect(mockOnSortChange).toHaveBeenCalledWith('new');
      expect(mockOnSortChange).toHaveBeenCalledTimes(1);
    });

    it('calls onSortChange with correct value for each sort option', async () => {
      const user = userEvent.setup();
      render(
        <FeedFilters
          sort="hot"
          onSortChange={mockOnSortChange}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      const sortOptions: SortOption[] = ['hot', 'new', 'top', 'rising', 'discussed'];

      for (const option of sortOptions) {
        const button = screen.getByRole('button', { name: option.charAt(0).toUpperCase() + option.slice(1) });
        await user.click(button);
      }

      expect(mockOnSortChange).toHaveBeenCalledTimes(5);
      sortOptions.forEach((option, index) => {
        expect(mockOnSortChange).toHaveBeenNthCalledWith(index + 1, option);
      });
    });
  });

  describe('Timeframe selector', () => {
    it('does not show timeframe selector when sort is not "top"', () => {
      render(
        <FeedFilters
          sort="hot"
          onSortChange={mockOnSortChange}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      expect(screen.queryByText('Timeframe:')).not.toBeInTheDocument();
    });

    it('shows timeframe selector when sort is "top"', () => {
      render(
        <FeedFilters
          sort="top"
          timeframe="day"
          onSortChange={mockOnSortChange}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      expect(screen.getByText('Timeframe:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Past Hour' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Past Day' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Past Week' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Past Month' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Past Year' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'All Time' })).toBeInTheDocument();
    });

    it('applies primary variant to selected timeframe', () => {
      render(
        <FeedFilters
          sort="top"
          timeframe="week"
          onSortChange={mockOnSortChange}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      const weekButton = screen.getByRole('button', { name: 'Past Week' });
      const dayButton = screen.getByRole('button', { name: 'Past Day' });

      // Selected timeframe should have primary variant
      expect(weekButton.className).toContain('bg-primary-500');
      expect(weekButton.className).toContain('text-white');
      
      // Unselected timeframe should have ghost variant
      expect(dayButton.className).toContain('bg-transparent');
    });

    it('calls onTimeframeChange when clicking a timeframe option', async () => {
      const user = userEvent.setup();
      render(
        <FeedFilters
          sort="top"
          timeframe="day"
          onSortChange={mockOnSortChange}
          onTimeframeChange={mockOnTimeframeChange}
        />
      );

      const weekButton = screen.getByRole('button', { name: 'Past Week' });
      await user.click(weekButton);

      expect(mockOnTimeframeChange).toHaveBeenCalledWith('week');
      expect(mockOnTimeframeChange).toHaveBeenCalledTimes(1);
    });
  });
});
