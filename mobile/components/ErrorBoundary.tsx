/**
 * Sentry Error Boundary
 * 
 * Wraps the application to catch and report unhandled errors to Sentry
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Report to Sentry
        Sentry.withScope((scope) => {
            scope.setContext('errorBoundary', {
                componentStack: errorInfo.componentStack,
            });
            Sentry.captureException(error);
        });

        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
        });
    };

    render(): React.ReactNode {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.title}>Oops! Something went wrong</Text>
                        <Text style={styles.message}>
                            We&apos;ve been notified and are working on a fix. Please try again.
                        </Text>
                        {__DEV__ && this.state.error && (
                            <View style={styles.errorDetails}>
                                <Text style={styles.errorTitle}>Error Details:</Text>
                                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        maxWidth: 400,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 24,
    },
    errorDetails: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
        width: '100%',
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;
