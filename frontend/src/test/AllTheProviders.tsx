import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import i18n from '@/i18n/config';

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });

export function AllTheProviders({ children }: PropsWithChildren) {
    const testQueryClient = createTestQueryClient();

    return (
        <QueryClientProvider client={testQueryClient}>
            <I18nextProvider i18n={i18n}>
                <BrowserRouter>{children}</BrowserRouter>
            </I18nextProvider>
        </QueryClientProvider>
    );
}
