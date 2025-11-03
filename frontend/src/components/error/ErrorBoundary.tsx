/**
 * Error Boundary Component
 * Catches errors in component tree and displays user-friendly error messages
 */

/* eslint-disable react-refresh/only-export-components */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ApiError, ErrorType } from '@/lib/mobile-api-client';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo!);
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

function DefaultErrorFallback({ error, errorInfo, resetError }: FallbackProps) {
  const isApiError = error instanceof ApiError;
  
  const title = isApiError ? getErrorTitle(error.type) : 'Something went wrong';
  const message = isApiError ? error.userMessage : error.message;
  const showDetails = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>

        {isApiError && error.type === ErrorType.OFFLINE && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your request will be automatically retried when you're back online.
            </p>
          </div>
        )}

        {showDetails && (
          <details className="mb-4 text-sm">
            <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-2">
              Technical Details
            </summary>
            <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 overflow-auto">
              <p className="font-mono text-xs text-gray-800 dark:text-gray-200 mb-2">
                <strong>Error:</strong> {error.toString()}
              </p>
              {isApiError && (
                <>
                  <p className="font-mono text-xs text-gray-800 dark:text-gray-200 mb-2">
                    <strong>Type:</strong> {error.type}
                  </p>
                  {error.statusCode && (
                    <p className="font-mono text-xs text-gray-800 dark:text-gray-200 mb-2">
                      <strong>Status:</strong> {error.statusCode}
                    </p>
                  )}
                </>
              )}
              {errorInfo?.componentStack && (
                <p className="font-mono text-xs text-gray-800 dark:text-gray-200">
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                </p>
              )}
            </div>
          </details>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetError}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Connection Problem';
    case ErrorType.TIMEOUT:
      return 'Request Timeout';
    case ErrorType.OFFLINE:
      return 'You're Offline';
    case ErrorType.AUTH:
      return 'Authentication Required';
    case ErrorType.VALIDATION:
      return 'Invalid Input';
    case ErrorType.SERVER:
      return 'Server Error';
    default:
      return 'Something Went Wrong';
  }
}
