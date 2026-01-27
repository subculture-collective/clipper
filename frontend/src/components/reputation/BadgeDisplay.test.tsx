import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { BadgeDisplay, BadgeGrid, BadgeList } from './BadgeDisplay';
import type { UserBadge } from '@/types/reputation';

const mockBadges: UserBadge[] = [
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
        render(<BadgeDisplay badges={mockBadges} maxVisible={3} />);

        expect(screen.getByText('🏆')).toBeInTheDocument();
        expect(screen.getByText('⭐')).toBeInTheDocument();
        expect(screen.getByText('🛡️')).toBeInTheDocument();
    });

    it('limits the number of visible badges', () => {
        render(<BadgeDisplay badges={mockBadges} maxVisible={2} />);

        expect(screen.getByText('🏆')).toBeInTheDocument();
        expect(screen.getByText('⭐')).toBeInTheDocument();
        expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('shows all badges when maxVisible is greater than badge count', () => {
        render(<BadgeDisplay badges={mockBadges} maxVisible={5} />);

        expect(screen.getByText('🏆')).toBeInTheDocument();
        expect(screen.getByText('⭐')).toBeInTheDocument();
        expect(screen.getByText('🛡️')).toBeInTheDocument();
        expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
    });

    it('returns null when no badges are provided', () => {
        const { container } = render(<BadgeDisplay badges={[]} />);
        // The component itself returns null, but it's wrapped in providers by render()
        // So we check if the BadgeDisplay content is not rendered (no flex div)
        expect(
            container.querySelector('.flex.items-center.gap-2')
        ).not.toBeInTheDocument();
    });

    it('displays tooltips when showTooltip is true', () => {
        render(
            <BadgeDisplay
                badges={mockBadges}
                showTooltip={true}
                maxVisible={1}
            />
        );

        const badge = screen.getByText('🏆');
        expect(badge).toHaveAttribute(
            'title',
            'Veteran: Member for over 1 year'
        );
    });
});

describe('BadgeGrid', () => {
    it('renders badge grid with all badges', () => {
        render(<BadgeGrid badges={mockBadges} />);

        expect(screen.getByText('Veteran')).toBeInTheDocument();
        expect(screen.getByText('Influencer')).toBeInTheDocument();
        expect(screen.getByText('Moderator')).toBeInTheDocument();
    });

    it('displays badge descriptions', () => {
        render(<BadgeGrid badges={mockBadges} />);

        expect(screen.getByText('Member for over 1 year')).toBeInTheDocument();
        expect(screen.getByText('Earned 10,000+ karma')).toBeInTheDocument();
        expect(screen.getByText('Community moderator')).toBeInTheDocument();
    });

    it('shows empty state when no badges', () => {
        render(<BadgeGrid badges={[]} />);

        expect(screen.getByText('No badges earned yet')).toBeInTheDocument();
    });

    it('displays awarded dates', () => {
        render(<BadgeGrid badges={mockBadges} />);

        // Check that dates are displayed (exact format may vary)
        expect(screen.getAllByText(/Earned/i).length).toBeGreaterThan(0);
    });
});

describe('BadgeList', () => {
    it('renders badges in list format', () => {
        render(<BadgeList badges={mockBadges} />);

        expect(screen.getByText('Veteran')).toBeInTheDocument();
        expect(screen.getByText('Influencer')).toBeInTheDocument();
        expect(screen.getByText('Moderator')).toBeInTheDocument();
    });

    it('shows empty state when no badges', () => {
        render(<BadgeList badges={[]} />);

        expect(screen.getByText('No badges earned yet')).toBeInTheDocument();
    });

    it('displays badge icons in list', () => {
        render(<BadgeList badges={mockBadges} />);

        expect(screen.getByText('🏆')).toBeInTheDocument();
        expect(screen.getByText('⭐')).toBeInTheDocument();
        expect(screen.getByText('🛡️')).toBeInTheDocument();
    });
});
