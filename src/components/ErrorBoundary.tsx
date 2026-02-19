import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center font-mono bg-black p-6">
                    <div className="max-w-md text-center glass-panel border border-red-500/30 rounded-lg p-8">
                        <div className="text-red-400 text-4xl mb-4">💀</div>
                        <h2 className="text-red-400 text-lg font-bold tracking-widest uppercase mb-3">
                            System Crash
                        </h2>
                        <p className="text-gray-500 text-xs mb-6 leading-relaxed">
                            {this.state.error?.message ?? 'Unexpected error'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 border border-red-500 text-red-400 rounded hover:bg-red-500 hover:text-black transition-all text-sm uppercase tracking-widest"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
