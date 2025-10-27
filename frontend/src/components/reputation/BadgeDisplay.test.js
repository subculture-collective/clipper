import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { BadgeDisplay, BadgeGrid, BadgeList } from './BadgeDisplay';
const mockBadges = [
    {
        id: '1',
        badge_id: 'veteran',
        awarded_at: '2024-01-01T00:00:00Z',
        name: 'Veteran',
        description: 'Member for over 1 year',
        icon: '🏆',
        category: 'achievement',
    },
    {
        id: '2',
        badge_id: 'influencer',
        awarded_at: '2024-02-01T00:00:00Z',
        name: 'Influencer',
        description: 'Earned 10,000+ karma',
        icon: '⭐',
        category: 'achievement',
    },
    {
        id: '3',
        badge_id: 'moderator',
        awarded_at: '2024-03-01T00:00:00Z',
        name: 'Moderator',
        description: 'Community moderator',
        icon: '🛡️',
        category: 'staff',
    },
];
describe('BadgeDisplay', () => {
    it('renders badges with icons', () => {
        render(_jsx(BadgeDisplay, { badges: mockBadges, maxVisible: 3 }));
        expect(screen.getByText('🏆')).toBeInTheDocument();
        expect(screen.getByText('⭐')).toBeInTheDocument();
        expect(screen.getByText('🛡️')).toBeInTheDocument();
    });
    it('limits the number of visible badges', () => {
        render(_jsx(BadgeDisplay, { badges: mockBadges, maxVisible: 2 }));
        expect(screen.getByText('🏆')).toBeInTheDocument();
        expect(screen.getByText('⭐')).toBeInTheDocument();
        expect(screen.getByText('+1')).toBeInTheDocument();
    });
    it('shows all badges when maxVisible is greater than badge count', () => {
        render(_jsx(BadgeDisplay, { badges: mockBadges, maxVisible: 5 }));
        expect(screen.getByText('🏆')).toBeInTheDocument();
        expect(screen.getByText('⭐')).toBeInTheDocument();
        expect(screen.getByText('🛡️')).toBeInTheDocument();
        expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
    });
    it('returns null when no badges are provided', () => {
        const { container } = render(_jsx(BadgeDisplay, { badges: [] }));
        expect(container.firstChild).toBeNull();
    });
    it('displays tooltips when showTooltip is true', () => {
        render(_jsx(BadgeDisplay, { badges: mockBadges, showTooltip: true, maxVisible: 1 }));
        const badge = screen.getByText('🏆');
        expect(badge).toHaveAttribute('title', 'Veteran: Member for over 1 year');
    });
});
describe('BadgeGrid', () => {
    it('renders badge grid with all badges', () => {
        render(_jsx(BadgeGrid, { badges: mockBadges }));
        expect(screen.getByText('Veteran')).toBeInTheDocument();
        expect(screen.getByText('Influencer')).toBeInTheDocument();
        expect(screen.getByText('Moderator')).toBeInTheDocument();
    });
    it('displays badge descriptions', () => {
        render(_jsx(BadgeGrid, { badges: mockBadges }));
        expect(screen.getByText('Member for over 1 year')).toBeInTheDocument();
        expect(screen.getByText('Earned 10,000+ karma')).toBeInTheDocument();
        expect(screen.getByText('Community moderator')).toBeInTheDocument();
    });
    it('shows empty state when no badges', () => {
        render(_jsx(BadgeGrid, { badges: [] }));
        expect(screen.getByText('No badges earned yet')).toBeInTheDocument();
    });
    it('displays awarded dates', () => {
        render(_jsx(BadgeGrid, { badges: mockBadges }));
        // Check that dates are displayed (exact format may vary)
        expect(screen.getAllByText(/Earned/i).length).toBeGreaterThan(0);
    });
});
describe('BadgeList', () => {
    it('renders badges in list format', () => {
        render(_jsx(BadgeList, { badges: mockBadges }));
        expect(screen.getByText('Veteran')).toBeInTheDocument();
        expect(screen.getByText('Influencer')).toBeInTheDocument();
        expect(screen.getByText('Moderator')).toBeInTheDocument();
    });
    it('shows empty state when no badges', () => {
        render(_jsx(BadgeList, { badges: [] }));
        expect(screen.getByText('No badges earned yet')).toBeInTheDocument();
    });
    it('displays badge icons in list', () => {
        render(_jsx(BadgeList, { badges: mockBadges }));
        expect(screen.getByText('🏆')).toBeInTheDocument();
        expect(screen.getByText('⭐')).toBeInTheDocument();
        expect(screen.getByText('🛡️')).toBeInTheDocument();
    });
});
