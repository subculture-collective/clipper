import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import './i18n'; // Initialize i18n
import App from './App.tsx';
// Create React Query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 60 * 5, // 5 minutes
        },
    },
});
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(App, {}) }) }));
