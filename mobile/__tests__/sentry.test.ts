/**
 * Tests for Sentry integration
 */

import * as Sentry from '@sentry/react-native';

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
    init: jest.fn(),
    setUser: jest.fn(),
    addBreadcrumb: jest.fn(),
    captureMessage: jest.fn(),
    captureException: jest.fn(),
    withScope: jest.fn((callback) => {
        const mockScope = {
            setContext: jest.fn(),
        };
        callback(mockScope);
    }),
    startSpan: jest.fn((config, callback) => {
        if (callback) callback();
    }),
    setTag: jest.fn(),
    setContext: jest.fn(),
    reactNavigationIntegration: jest.fn(),
}));

describe('Sentry Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('User Context', () => {
        it('should set user context with valid user', () => {
            const { setSentryUser } = require('../lib/sentry');
            const user = {
                id: 'user123',
                username: 'testuser',
            };

            setSentryUser(user);

            expect(Sentry.setUser).toHaveBeenCalledWith({
                id: 'user123',
                username: 'testuser',
            });
        });

        it('should clear user context when user is null', () => {
            const { setSentryUser } = require('../lib/sentry');
            setSentryUser(null);

            expect(Sentry.setUser).toHaveBeenCalledWith(null);
        });
    });

    describe('Breadcrumbs', () => {
        it('should add breadcrumb with correct data', () => {
            const { addBreadcrumb } = require('../lib/sentry');
            addBreadcrumb('Test message', 'test-category', 'info', { key: 'value' });

            expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Test message',
                    category: 'test-category',
                    level: 'info',
                    data: { key: 'value' },
                })
            );
        });
    });

    describe('Error Capture', () => {
        it('should capture message with correct level', () => {
            const { captureMessage } = require('../lib/sentry');
            captureMessage('Test message', 'warning');

            expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'warning');
        });

        it('should capture exception', () => {
            const { captureException } = require('../lib/sentry');
            const error = new Error('Test error');
            captureException(error);

            expect(Sentry.captureException).toHaveBeenCalledWith(error);
        });

        it('should capture exception with context', () => {
            const { captureException } = require('../lib/sentry');
            const error = new Error('Test error');
            const context = { component: 'TestComponent' };

            captureException(error, context);

            expect(Sentry.withScope).toHaveBeenCalled();
            expect(Sentry.captureException).toHaveBeenCalledWith(error);
        });
    });

    describe('Tags and Context', () => {
        it('should set tag', () => {
            const { setTag } = require('../lib/sentry');
            setTag('environment', 'test');

            expect(Sentry.setTag).toHaveBeenCalledWith('environment', 'test');
        });

        it('should set context', () => {
            const { setContext } = require('../lib/sentry');
            const context = { userId: '123', action: 'submit' };
            setContext('user-action', context);

            expect(Sentry.setContext).toHaveBeenCalledWith('user-action', context);
        });
    });

    describe('Performance Monitoring', () => {
        it('should track app start', () => {
            const { trackAppStart } = require('../lib/performance');
            trackAppStart();

            expect(Sentry.startSpan).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'App Start',
                    op: 'app.start',
                }),
                expect.any(Function)
            );
        });

        it('should track screen transition', () => {
            const { trackScreenTransition } = require('../lib/performance');
            trackScreenTransition('HomeScreen');

            expect(Sentry.startSpan).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Screen: HomeScreen',
                    op: 'navigation',
                }),
                expect.any(Function)
            );
        });
    });
});
