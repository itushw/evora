import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Something went wrong while loading this page.',
    };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Captured cleanly by boundary state
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#ffffff] text-[#000000] px-6 py-24">
          <div className="mx-auto max-w-[720px] rounded-2xl border border-[#e2e2e2] bg-[#ffffff] p-10 md:p-16">
            <p className="font-mono-tabular text-xs text-[#5e5e5e]">ERROR 500</p>
            <h1 className="mt-4 display-xl text-[#000000]">
              Something went wrong on our end
            </h1>
            <p className="mt-5 text-base text-[#5e5e5e] leading-relaxed">
              We ran into an unexpected error loading this screen. Try refreshing or head back to the events page.
            </p>
            {this.state.errorMessage ? (
              <p className="mt-5 font-mono-tabular text-xs text-[#5e5e5e] border-t border-[#e2e2e2] pt-4">
                {this.state.errorMessage}
              </p>
            ) : null}
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => window.location.assign('/')}
                className="bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-6 py-3 rounded-full"
              >
                Back to Home
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-[#efefef] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-6 py-3 rounded-full"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
