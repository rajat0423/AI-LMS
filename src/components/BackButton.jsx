import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ fallbackPath = '/dashboard' }) {
    const navigate = useNavigate();
    const handleBack = () => {
        const hasHistory = window.history.state && window.history.state.idx > 0;
        if (hasHistory) {
            navigate(-1);
        } else {
            navigate(fallbackPath);
        }
    };

    return (
        <button 
            onClick={handleBack}
            className="no-print inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-sm transition-all duration-200 active:scale-95 self-start mb-4"
        >
            <ArrowLeft size={16} /> Back
        </button>
    );
}
