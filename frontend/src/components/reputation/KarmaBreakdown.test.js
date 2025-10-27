import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@/test/test-utils';
import { describe, expect, it } from 'vitest';
import { KarmaBreakdownChart, KarmaStats } from './KarmaBreakdown';
const mockBreakdown = {
    clip_karma: 500,
    comment_karma: 734,
    total_karma: 1234,
};
const mockZeroBreakdown = {
    clip_karma: 0,
    comment_karma: 0,
    total_karma: 0,
};
describe('KarmaBreakdownChart', () => {
    it('displays total karma correctly', () => {
        render(_jsx(KarmaBreakdownChart, { breakdown: mockBreakdown }));
        expect(screen.getByText('1,234')).toBeInTheDocument();
        expect(screen.getByText('Total Karma')).toBeInTheDocument();
    });
    it('displays clip karma amount', () => {
        render(_jsx(KarmaBreakdownChart, { breakdown: mockBreakdown }));
        expect(screen.getByText('500')).toBeInTheDocument();
        expect(screen.getByText('📹 Clip Karma')).toBeInTheDocument();
    });
    it('displays comment karma amount', () => {
        render(_jsx(KarmaBreakdownChart, { breakdown: mockBreakdown }));
        expect(screen.getByText('734')).toBeInTheDocument();
        expect(screen.getByText('💬 Comment Karma')).toBeInTheDocument();
    });
    it('calculates percentages correctly', () => {
        render(_jsx(KarmaBreakdownChart, { breakdown: mockBreakdown }));
        // 500/1234 = 40.5%
        expect(screen.getByText('40.5%')).toBeInTheDocument();
        // 734/1234 = 59.5%
        expect(screen.getByText('59.5%')).toBeInTheDocument();
    });
    it('handles zero karma gracefully', () => {
        render(_jsx(KarmaBreakdownChart, { breakdown: mockZeroBreakdown }));
        // Multiple zeros are rendered (total, clip, comment); ensure at least one is present
        expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
        // Should show 0.0% for both
        expect(screen.getAllByText('0.0%').length).toBe(2);
    });
    it('displays karma breakdown title', () => {
        render(_jsx(KarmaBreakdownChart, { breakdown: mockBreakdown }));
        expect(screen.getByText('Karma Breakdown')).toBeInTheDocument();
    });
    it('shows percentage labels', () => {
        render(_jsx(KarmaBreakdownChart, { breakdown: mockBreakdown }));
        expect(screen.getByText('from clips')).toBeInTheDocument();
        expect(screen.getByText('from comments')).toBeInTheDocument();
    });
});
describe('KarmaStats', () => {
    it('displays all karma stats', () => {
        render(_jsx(KarmaStats, { breakdown: mockBreakdown }));
        expect(screen.getByText('1,234')).toBeInTheDocument();
        expect(screen.getByText('500')).toBeInTheDocument();
        expect(screen.getByText('734')).toBeInTheDocument();
    });
    it('displays stat labels', () => {
        render(_jsx(KarmaStats, { breakdown: mockBreakdown }));
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('Clips')).toBeInTheDocument();
        expect(screen.getByText('Comments')).toBeInTheDocument();
    });
    it('formats large numbers with commas', () => {
        const largeBreakdown = {
            clip_karma: 50000,
            comment_karma: 73400,
            total_karma: 123400,
        };
        render(_jsx(KarmaStats, { breakdown: largeBreakdown }));
        expect(screen.getByText('123,400')).toBeInTheDocument();
        expect(screen.getByText('50,000')).toBeInTheDocument();
        expect(screen.getByText('73,400')).toBeInTheDocument();
    });
    it('renders three stat cards', () => {
        const { container } = render(_jsx(KarmaStats, { breakdown: mockBreakdown }));
        const statCards = container.querySelectorAll('.bg-gray-800');
        expect(statCards.length).toBe(3);
    });
});
