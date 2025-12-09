import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatTimestamp } from './utils';

describe('formatTimestamp', () => {
  beforeEach(() => {
    // Set a fixed "now" for consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Invalid dates', () => {
    it('should handle invalid date strings', () => {
      const result = formatTimestamp('invalid-date');
      expect(result.display).toBe('Invalid date');
      expect(result.title).toBe('Invalid date');
    });

    it('should handle empty strings', () => {
      const result = formatTimestamp('');
      expect(result.display).toBe('Invalid date');
      expect(result.title).toBe('Invalid date');
    });
  });

  describe('Future dates', () => {
    it('should show exact time for future dates', () => {
      const futureDate = new Date('2024-03-15T16:00:00.000Z'); // 1 hour in future
      const result = formatTimestamp(futureDate);
      expect(result.display).toBe('4:00 PM'); // UTC+0 time
      expect(result.title).toContain('Mar 15, 2024');
    });
  });

  describe('Relative time (within 60 minutes)', () => {
    it('should show "less than a minute ago" for very recent timestamps', () => {
      const now = new Date('2024-03-15T15:00:00.000Z');
      const recent = new Date('2024-03-15T14:59:30.000Z'); // 30 seconds ago
      const result = formatTimestamp(recent);
      expect(result.display).toContain('ago');
      expect(result.title).toContain('Mar 15, 2024');
    });

    it('should show relative time for 2 minutes ago', () => {
      const twoMinutesAgo = new Date('2024-03-15T14:58:00.000Z');
      const result = formatTimestamp(twoMinutesAgo);
      expect(result.display).toBe('2 minutes ago');
      expect(result.title).toContain('Mar 15, 2024');
    });

    it('should show relative time for 59 minutes ago', () => {
      const fiftyNineMinutesAgo = new Date('2024-03-15T14:01:00.000Z');
      const result = formatTimestamp(fiftyNineMinutesAgo);
      // formatDistanceToNow rounds to "about 1 hour ago" at 59 minutes
      expect(result.display).toContain('ago');
      expect(result.title).toContain('Mar 15, 2024');
    });

    it('should show "1 hour ago" for exactly 60 minutes', () => {
      const sixtyMinutesAgo = new Date('2024-03-15T14:00:00.000Z');
      const result = formatTimestamp(sixtyMinutesAgo);
      expect(result.display).toBe('about 1 hour ago');
      expect(result.title).toContain('Mar 15, 2024');
    });
  });

  describe('Exact time (after 60 minutes)', () => {
    it('should show time for 61 minutes ago (today)', () => {
      const sixtyOneMinutesAgo = new Date('2024-03-15T13:59:00.000Z');
      const result = formatTimestamp(sixtyOneMinutesAgo);
      expect(result.display).toBe('1:59 PM');
      expect(result.title).toContain('Mar 15, 2024');
    });

    it('should show "Yesterday" with time for yesterday', () => {
      const yesterday = new Date('2024-03-14T14:30:00.000Z');
      const result = formatTimestamp(yesterday);
      expect(result.display).toBe('Yesterday 2:30 PM');
      expect(result.title).toContain('Mar 14, 2024');
    });

    it('should show date and time for this year', () => {
      const lastWeek = new Date('2024-03-08T10:15:00.000Z');
      const result = formatTimestamp(lastWeek);
      expect(result.display).toBe('Mar 8, 10:15 AM');
      expect(result.title).toContain('Mar 8, 2024');
    });

    it('should show full date for previous years', () => {
      const lastYear = new Date('2023-06-15T14:00:00.000Z');
      const result = formatTimestamp(lastYear);
      expect(result.display).toBe('Jun 15, 2023');
      expect(result.title).toContain('Jun 15, 2023');
    });
  });

  describe('Boundary cases', () => {
    it('should handle exactly at the boundary of 60 minutes', () => {
      const exactlyOneHour = new Date('2024-03-15T14:00:00.000Z');
      const result = formatTimestamp(exactlyOneHour);
      // Should show relative time since minutesDiff <= 60
      expect(result.display).toBe('about 1 hour ago');
    });

    it('should handle string dates', () => {
      const dateString = '2024-03-15T14:30:00.000Z';
      const result = formatTimestamp(dateString);
      expect(result.display).toBe('30 minutes ago');
      expect(result.title).toContain('Mar 15, 2024');
    });

    it('should handle Date objects', () => {
      const dateObj = new Date('2024-03-15T14:30:00.000Z');
      const result = formatTimestamp(dateObj);
      expect(result.display).toBe('30 minutes ago');
      expect(result.title).toContain('Mar 15, 2024');
    });
  });
});
