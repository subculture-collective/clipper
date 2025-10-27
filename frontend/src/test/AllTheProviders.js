import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            gcTime: 0,
        },
    },
});
export function AllTheProviders({ children }) {
    const testQueryClient = createTestQueryClient();
    return (_jsx(QueryClientProvider, { client: testQueryClient, children: _jsx(BrowserRouter, { children: children }) }));
}
