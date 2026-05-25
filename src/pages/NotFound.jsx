import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Home, ArrowLeft } from 'lucide-react';

function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/10 dark:bg-violet-500/5 blur-[100px] rounded-full pointer-events-none"></div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center z-10 glass-panel dark:glass-dark rounded-[2.5rem] p-10 md:p-12 border border-slate-200 dark:border-slate-800 shadow-xl">
                
                <h1 className="text-8xl md:text-9xl font-black font-heading text-slate-200 dark:text-slate-800 tracking-tighter mb-4 relative z-0">
                    404
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-4 rounded-3xl rotate-12 shadow-lg">
                            <Search size={40} />
                        </div>
                    </div>
                </h1>

                <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mb-3">Page Not Found</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                    We've searched everywhere, but this link seems to be broken or the course might have been moved.
                </p>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 shadow-md"
                    >
                        <ArrowLeft size={18} /> Go Back
                    </button>
                    <button 
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                        <Home size={18} /> Return to Dashboard
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default NotFound;
