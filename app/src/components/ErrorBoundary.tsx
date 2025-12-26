import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Radio App Error:', error);
    console.error('Error Info:', errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center p-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
            
            <p className="text-gray-300 mb-6">
              The radio app encountered an unexpected error. Don't worry, your listening experience should resume shortly.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-red-900/20 rounded-lg p-4 mb-6 text-left">
                <p className="font-mono text-sm text-red-300 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleRetry}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg px-6 py-3 flex items-center space-x-2 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Try Again</span>
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="bg-white/20 hover:bg-white/30 rounded-lg px-6 py-3 transition-all"
              >
                Reload Page
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mt-6">
              If this problem persists, please contact New Stars Radio support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

