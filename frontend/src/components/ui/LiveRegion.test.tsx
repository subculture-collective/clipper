import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { LiveRegion } from './LiveRegion';

describe('LiveRegion Component', () => {
    it('should render with polite priority by default', () => {
        render(<LiveRegion message='Test message' />);

        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        expect(liveRegion).toHaveTextContent('Test message');
    });

    it('should render with assertive priority when specified', () => {
        render(
            <LiveRegion
                message='Urgent message'
                priority='assertive'
            />
        );

        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    });

    it('should be screen-reader only (visually hidden)', () => {
        const { container } = render(<LiveRegion message='Hidden message' />);

        const liveRegion = container.querySelector('[role="status"]');
        expect(liveRegion?.className).toContain('sr-only');
    });

    it('should have aria-atomic attribute', () => {
        render(<LiveRegion message='Atomic message' />);

        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should clear message after specified time', async () => {
        vi.useFakeTimers();

        render(
            <LiveRegion
                message='Temporary message'
                clearAfter={1000}
            />
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Temporary message'
        );

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(1100);
        });

        // Message should be cleared
        expect(screen.getByRole('status')).toHaveTextContent('');

        vi.useRealTimers();
    });

    it('should not clear message when clearAfter is 0', async () => {
        vi.useFakeTimers();

        render(
            <LiveRegion
                message='Persistent message'
                clearAfter={0}
            />
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Persistent message'
        );

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        // Message should still be there
        expect(screen.getByRole('status')).toHaveTextContent(
            'Persistent message'
        );

        vi.useRealTimers();
    });

    it('should update message when prop changes', () => {
        const { rerender } = render(<LiveRegion message='First message' />);

        expect(screen.getByRole('status')).toHaveTextContent('First message');

        rerender(<LiveRegion message='Second message' />);

        expect(screen.getByRole('status')).toHaveTextContent('Second message');
    });
});

describe('useLiveRegion Hook', () => {
    it('should initialize with empty message', () => {
        const { result } = renderHook(() => useLiveRegion());

        expect(result.current.message).toBe('');
        expect(result.current.priority).toBe('polite');
    });

    it('should announce message with polite priority by default', () => {
        const { result } = renderHook(() => useLiveRegion());

        act(() => {
            result.current.announce('Test announcement');
        });

        expect(result.current.message).toBe('Test announcement');
        expect(result.current.priority).toBe('polite');
    });

    it('should announce message with assertive priority when specified', () => {
        const { result } = renderHook(() => useLiveRegion());

        act(() => {
            result.current.announce('Urgent announcement', 'assertive');
        });

        expect(result.current.message).toBe('Urgent announcement');
        expect(result.current.priority).toBe('assertive');
    });

    it('should clear message', () => {
        const { result } = renderHook(() => useLiveRegion());

        act(() => {
            result.current.announce('Test message');
        });

        expect(result.current.message).toBe('Test message');

        act(() => {
            result.current.clear();
        });

        expect(result.current.message).toBe('');
    });

    it('should update priority for each announcement', () => {
        const { result } = renderHook(() => useLiveRegion());

        act(() => {
            result.current.announce('First message', 'polite');
        });

        expect(result.current.priority).toBe('polite');

        act(() => {
            result.current.announce('Second message', 'assertive');
        });

        expect(result.current.priority).toBe('assertive');
    });
});
