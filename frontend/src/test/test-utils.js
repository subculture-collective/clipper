import { render } from '@testing-library/react';
import { AllTheProviders } from './AllTheProviders';
// Create a custom render function that includes providers
const customRender = (ui, options) => render(ui, { wrapper: AllTheProviders, ...options });
// Re-export everything
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';
export { customRender as render };
