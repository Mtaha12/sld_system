import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Button from '../ui/Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Global ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 mb-4 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-theme-main mb-1">
            Something went wrong rendering this component
          </h2>
          <p className="text-xs text-theme-muted max-w-md mb-4">
            {this.state.error?.message || 'An unexpected error occurred. The application remains secure and operational.'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReload}
              className="bg-brand-orange hover:bg-[#D44E35] text-white text-xs gap-1.5"
            >
              <Home className="w-3.5 h-3.5" /> Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
