'use client';

import React, { Component, ReactNode } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8">
                    <div className="text-center max-w-md">
                        <FaExclamationTriangle className="text-red-500 text-6xl mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                        <p className="text-gray-300 mb-6">
                            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="text-left bg-gray-800 p-4 rounded-lg mb-4 max-w-full overflow-auto">
                                <summary className="cursor-pointer text-sm font-medium mb-2">
                                    Error Details (Development Mode)
                                </summary>
                                <pre className="text-xs text-red-400 whitespace-pre-wrap break-words">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                {/* <FaRefresh className="text-sm" /> */}
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Refresh Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
