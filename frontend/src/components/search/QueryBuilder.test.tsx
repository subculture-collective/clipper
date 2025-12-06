import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryBuilder } from './QueryBuilder';

describe('QueryBuilder', () => {
    describe('Rendering', () => {
        it('should render input with placeholder', () => {
            render(<QueryBuilder />);

            expect(
                screen.getByRole('combobox')
            ).toBeInTheDocument();
            expect(
                screen.getByPlaceholderText(/build your query/i)
            ).toBeInTheDocument();
        });

        it('should render with custom placeholder', () => {
            render(<QueryBuilder placeholder='Custom placeholder' />);

            expect(
                screen.getByPlaceholderText('Custom placeholder')
            ).toBeInTheDocument();
        });

        it('should render with initial query', () => {
            render(<QueryBuilder initialQuery='game:valorant' />);

            expect(screen.getByRole('combobox')).toHaveValue('game:valorant');
        });

        it('should render example queries section by default', () => {
            render(<QueryBuilder />);

            expect(screen.getByText('Try an example:')).toBeInTheDocument();
            expect(screen.getByText('Popular Valorant clips')).toBeInTheDocument();
        });

        it('should hide examples when showExamples is false', () => {
            render(<QueryBuilder showExamples={false} />);

            expect(screen.queryByText('Try an example:')).not.toBeInTheDocument();
        });

        it('should render keyboard shortcuts legend', () => {
            render(<QueryBuilder />);

            expect(screen.getByText('Keyboard shortcuts:')).toBeInTheDocument();
        });

        it('should render search button', () => {
            render(<QueryBuilder />);

            expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
        });
    });

    describe('Input Handling', () => {
        it('should update query on input change', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();

            render(<QueryBuilder onChange={onChange} />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'game:valorant');

            expect(input).toHaveValue('game:valorant');
            expect(onChange).toHaveBeenCalled();
        });

        it('should call onSearch when Enter is pressed with valid query', async () => {
            const user = userEvent.setup();
            const onSearch = vi.fn();

            render(<QueryBuilder onSearch={onSearch} />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'game:valorant{Enter}');

            expect(onSearch).toHaveBeenCalledWith('game:valorant');
        });

        it('should not call onSearch with empty query', async () => {
            const user = userEvent.setup();
            const onSearch = vi.fn();

            render(<QueryBuilder onSearch={onSearch} />);

            const input = screen.getByRole('combobox');
            await user.click(input);
            await user.keyboard('{Enter}');

            expect(onSearch).not.toHaveBeenCalled();
        });
    });

    describe('Autocomplete', () => {
        it('should show suggestions when typing filter name', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'ga');

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument();
            });

            expect(screen.getByText('game:')).toBeInTheDocument();
        });

        it('should show suggestions for all filters on focus with empty input', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.click(input);

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument();
            });
        });

        it('should navigate suggestions with arrow keys', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'ga');

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument();
            });

            await user.keyboard('{ArrowDown}');

            const options = screen.getAllByRole('option');
            expect(options[0]).toHaveAttribute('aria-selected', 'true');
        });

        it('should close suggestions on Escape', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'ga');

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument();
            });

            await user.keyboard('{Escape}');

            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        });

        it('should select suggestion with Tab', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'ga');

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument();
            });

            await user.keyboard('{ArrowDown}{Tab}');

            expect(input.getAttribute('value')).toContain('game:');
        });

        it('should show enum values after colon for enum filters', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'sort:');

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument();
            });

            expect(screen.getByText('relevance')).toBeInTheDocument();
            expect(screen.getByText('recent')).toBeInTheDocument();
            expect(screen.getByText('popular')).toBeInTheDocument();
        });

        it('should show date options for date filters', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'after:');

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument();
            });

            expect(screen.getByText('today')).toBeInTheDocument();
            expect(screen.getByText('yesterday')).toBeInTheDocument();
            expect(screen.getByText('last-week')).toBeInTheDocument();
        });

        it('should show comparison operators for range filters', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'votes:');

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument();
            });

            expect(screen.getByText('>')).toBeInTheDocument();
            expect(screen.getByText('>=')).toBeInTheDocument();
            expect(screen.getByText('<')).toBeInTheDocument();
        });
    });

    describe('Validation', () => {
        it('should show error for invalid filter name', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'invalidfilter:value');

            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument();
            });

            expect(screen.getByText(/unknown filter/i)).toBeInTheDocument();
        });

        it('should show suggestions in error message', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'gam:valorant');

            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument();
            });

            // There may be multiple suggestions containing "did you mean"
            const suggestions = screen.getAllByText(/did you mean/i);
            expect(suggestions.length).toBeGreaterThan(0);
        });

        it('should clear error when query becomes valid', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'invalidfilter:value');

            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument();
            });

            await user.clear(input);
            await user.type(input, 'game:valorant');

            await waitFor(() => {
                expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            });
        });

        it('should mark input as invalid with aria-invalid', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'invalidfilter:value');

            await waitFor(() => {
                expect(input).toHaveAttribute('aria-invalid', 'true');
            });
        });

        it('should disable search button when query is invalid', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'invalidfilter:value');

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
            });
        });
    });

    describe('Example Queries', () => {
        it('should fill input with example query on click', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const exampleButton = screen.getByText('Popular Valorant clips');
            await user.click(exampleButton);

            const input = screen.getByRole('combobox');
            expect(input).toHaveValue('game:valorant votes:>50 sort:popular');
        });

        it('should call onChange when example is selected', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();

            render(<QueryBuilder onChange={onChange} />);

            const exampleButton = screen.getByText('Popular Valorant clips');
            await user.click(exampleButton);

            expect(onChange).toHaveBeenCalledWith(
                'game:valorant votes:>50 sort:popular'
            );
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            expect(input).toHaveAttribute('aria-label', 'Advanced query builder');
            expect(input).toHaveAttribute('aria-haspopup', 'listbox');
            expect(input).toHaveAttribute('aria-autocomplete', 'list');
        });

        it('should have custom aria-label when provided', () => {
            render(<QueryBuilder ariaLabel='Custom search' />);

            const input = screen.getByRole('combobox');
            expect(input).toHaveAttribute('aria-label', 'Custom search');
        });

        it('should have aria-describedby pointing to helper text', () => {
            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            expect(input).toHaveAttribute('aria-describedby', 'query-helper');
        });

        it('should have aria-describedby pointing to error when invalid', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'invalidfilter:value');

            await waitFor(() => {
                expect(input).toHaveAttribute('aria-describedby', 'query-error');
            });
        });
    });

    describe('Keyboard Shortcuts', () => {
        it('should accept suggestion with Enter when selected', async () => {
            const user = userEvent.setup();

            render(<QueryBuilder />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'ga');

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument();
            });

            await user.keyboard('{ArrowDown}{Enter}');

            expect(input.getAttribute('value')).toContain('game:');
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        });

        it('should force submit with Ctrl+Enter even with errors', async () => {
            const user = userEvent.setup();
            const onSearch = vi.fn();

            render(<QueryBuilder onSearch={onSearch} />);

            const input = screen.getByRole('combobox');
            await user.type(input, 'invalidfilter:value');

            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument();
            });

            await user.keyboard('{Control>}{Enter}{/Control}');

            expect(onSearch).toHaveBeenCalledWith('invalidfilter:value');
        });
    });
});
