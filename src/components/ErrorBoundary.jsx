import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in React Tree:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700 text-center">
                        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertCircle size={32} />
                        </div>
                        <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mb-2">Something went wrong</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                            A critical error occurred while rendering this page. Our engineers have been notified.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full flex justify-center items-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                            <RefreshCcw size={18} /> Refresh Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
