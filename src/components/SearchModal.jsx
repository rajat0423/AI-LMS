import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, FileText, BookOpen, Sparkles, CornerDownLeft } from 'lucide-react';
import { apiUrl } from '../api';
import { useAuth } from '../context/useAuth';

function SearchModal({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { token } = useAuth();
    const debounceRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const searchApi = useCallback(async (q) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/v1/search?q=${encodeURIComponent(q)}`), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setResults(data.results || []);
            }
        } catch {
            // Fallback: local search for tools
            const tools = [
                { type: 'tool', name: 'Dashboard', path: '/dashboard' },
                { type: 'tool', name: 'AI Interviewer', path: '/interview' },
                { type: 'tool', name: 'Resume Analyzer', path: '/resume' },
                { type: 'tool', name: 'Email Generator', path: '/email-writer' },
                { type: 'tool', name: 'Blog Writer', path: '/blog-writer' },
                { type: 'tool', name: 'Speaking Exercise', path: '/speaking' },
                { type: 'tool', name: 'AI Tools Hub', path: '/ai-tools' },
                { type: 'tool', name: 'Profile', path: '/profile' },
                { type: 'tool', name: 'Settings', path: '/settings' },
            ];
            setResults(tools.filter(t => t.name.toLowerCase().includes(q.toLowerCase())));
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchApi(query), 200);
        return () => clearTimeout(debounceRef.current);
    }, [query, searchApi]);

    const handleSelect = (result) => {
        navigate(result.path);
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'module': return <BookOpen size={16} className="text-indigo-500" />;
            case 'lesson': return <FileText size={16} className="text-violet-500" />;
            default: return <Sparkles size={16} className="text-emerald-500" />;
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.15 }}
                    className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
                        <Search size={20} className="text-slate-400 flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search tools, modules, lessons..."
                            className="flex-1 text-base text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none bg-transparent font-medium"
                        />
                        <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            ESC
                        </kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-80 overflow-y-auto">
                        {isLoading && (
                            <div className="px-5 py-8 text-center text-sm text-slate-400 font-medium">Searching...</div>
                        )}
                        {!isLoading && query && results.length === 0 && (
                            <div className="px-5 py-8 text-center text-sm text-slate-400 font-medium">No results found for "{query}"</div>
                        )}
                        {!isLoading && results.map((r, i) => (
                            <button
                                key={i}
                                onClick={() => handleSelect(r)}
                                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                                    i === selectedIndex 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                {getIcon(r.type)}
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate">{r.name}</div>
                                    {r.description && (
                                        <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{r.description}</div>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">{r.type}</span>
                                {i === selectedIndex && <CornerDownLeft size={14} className="text-indigo-400 dark:text-indigo-500 flex-shrink-0" />}
                            </button>
                        ))}
                        {!query && !isLoading && (
                            <div className="px-5 py-8 text-center text-sm text-slate-400 font-medium">
                                Type to search tools, modules, and lessons
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <span>Navigate with ↑ ↓</span>
                        <span>Select with ↵</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default SearchModal;
