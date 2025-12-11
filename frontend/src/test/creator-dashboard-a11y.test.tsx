/**
 * Comprehensive accessibility tests for Creator Dashboard components
 * Tests WCAG 2.1 Level AA compliance
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import MetricCard from '../components/analytics/MetricCard';
import LineChartComponent from '../components/analytics/LineChartComponent';
import PieChartComponent from '../components/analytics/PieChartComponent';
import BarChartComponent from '../components/analytics/BarChartComponent';
import DateRangeSelector from '../components/analytics/DateRangeSelector';

expect.extend(toHaveNoViolations);

describe('Creator Dashboard - Accessibility Compliance', () => {
  describe('MetricCard Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <MetricCard
          title="Total Views"
          value={1000}
          subtitle="Last 30 days"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have violations with trend data', async () => {
      const { container } = render(
        <MetricCard
          title="Engagement Rate"
          value="5.2%"
          subtitle="Compared to last month"
          trend={{ value: 12.5, isPositive: true }}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('LineChartComponent', () => {
    it('should not have accessibility violations', async () => {
      const mockData = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 150 },
        { date: '2024-01-03', value: 120 },
      ];

      const { container } = render(
        <LineChartComponent
          data={mockData}
          title="Views Trend"
          valueLabel="Views"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('PieChartComponent', () => {
    it('should not have accessibility violations', async () => {
      const mockData = [
        { name: 'Desktop', value: 60 },
        { name: 'Mobile', value: 30 },
        { name: 'Tablet', value: 10 },
      ];

      const { container } = render(
        <PieChartComponent
          data={mockData}
          title="Device Distribution"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('BarChartComponent', () => {
    it('should not have accessibility violations', async () => {
      const mockData = [
        { name: 'USA', value: 500 },
        { name: 'UK', value: 300 },
        { name: 'Canada', value: 200 },
      ];

      const { container } = render(
        <BarChartComponent
          data={mockData}
          title="Top Countries"
          valueLabel="Views"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('DateRangeSelector', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <DateRangeSelector value={30} onChange={() => {}} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have violations with custom options', async () => {
      const customOptions = [
        { label: 'Today', value: 1 },
        { label: 'This Week', value: 7 },
        { label: 'This Month', value: 30 },
      ];

      const { container } = render(
        <DateRangeSelector
          value={7}
          onChange={() => {}}
          options={customOptions}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Semantic HTML Structure', () => {
    it('MetricCard uses semantic HTML', () => {
      const { container } = render(
        <MetricCard title="Test Metric" value={100} />
      );

      // Should have proper heading
      const heading = container.querySelector('h3');
      expect(heading).not.toBeNull();
      expect(heading?.textContent).toBe('Test Metric');
    });

    it('Chart components use semantic headings', () => {
      const mockData = [{ date: '2024-01-01', value: 100 }];
      const { container } = render(
        <LineChartComponent
          data={mockData}
          title="Test Chart"
          valueLabel="Value"
        />
      );

      const heading = container.querySelector('h3');
      expect(heading).not.toBeNull();
      expect(heading?.textContent).toBe('Test Chart');
    });
  });

  describe('Keyboard Navigation', () => {
    it('DateRangeSelector buttons are keyboard accessible', () => {
      const { container } = render(
        <DateRangeSelector value={30} onChange={() => {}} />
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        // Buttons should not have tabindex=-1 (should be focusable)
        expect(button.getAttribute('tabindex')).not.toBe('-1');
      });
    });
  });

  describe('Color Contrast (Manual Verification Required)', () => {
    it('documents color classes used', () => {
      // This test documents the color combinations used
      // Manual verification with contrast checkers is required
      const colorCombinations = [
        { bg: 'bg-white', text: 'text-gray-900', description: 'Light mode card text' },
        { bg: 'dark:bg-gray-800', text: 'dark:text-white', description: 'Dark mode card text' },
        { bg: 'bg-gray-50', text: 'text-gray-700', description: 'Light mode subtle text' },
        { bg: 'dark:bg-gray-900', text: 'dark:text-gray-300', description: 'Dark mode subtle text' },
      ];

      // Document that these need manual verification
      expect(colorCombinations.length).toBeGreaterThan(0);
    });
  });

  describe('Focus Management', () => {
    it('interactive elements have visible focus indicators', () => {
      const { container } = render(
        <DateRangeSelector value={30} onChange={() => {}} />
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        const classList = Array.from(button.classList);
        // Should have focus ring classes
        const hasFocusRing = classList.some((cls) =>
          cls.startsWith('focus:ring')
        );
        expect(hasFocusRing).toBe(true);
      });
    });
  });
});
