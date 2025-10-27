import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSwitcher } from './LanguageSwitcher';
import i18n from '../../i18n';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    // Reset to English before each test
    await i18n.changeLanguage('en');
  });

  it('renders all language options', () => {
    render(<LanguageSwitcher />);

    // Check for flag emojis
    expect(screen.getByTitle('English')).toBeInTheDocument();
    expect(screen.getByTitle('Español')).toBeInTheDocument();
    expect(screen.getByTitle('Français')).toBeInTheDocument();
  });

  it('highlights the current language', () => {
    render(<LanguageSwitcher />);

    const englishButton = screen.getByTitle('English');
    expect(englishButton).toHaveClass('bg-primary-100');
  });

  it('changes language when clicking a language button', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const spanishButton = screen.getByTitle('Español');
    await user.click(spanishButton);

    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });
  });

  it('persists language selection', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const frenchButton = screen.getByTitle('Français');
    await user.click(frenchButton);

    await waitFor(() => {
      expect(localStorage.getItem('i18nextLng')).toBe('fr');
    });
  });
});
