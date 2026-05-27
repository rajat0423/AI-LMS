import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useGlobalUser } from '../context/useGlobalUser';
import { useTheme } from '../context/useTheme';
import { 
    Search, Bell, Menu, X, Home, FolderKanban, Sparkles, User, LogOut, Settings, Moon, Sun, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchModal from './SearchModal';
import NotificationPanel from './NotificationPanel';

function Navbar() {
    const location = useLocation();
    const { user, logout } = useAuth();
    const { userState } = useGlobalUser();
    const { theme, toggleTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    useEffect(() => {
        // Route changes should close transient navigation surfaces.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMobileMenuOpen(false);
        setIsProfileDropdownOpen(false);
        setIsNotifOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const displayName = userState?.name || user?.name || 'Student';

    const navLinks = [
        { name: 'Home', path: '/dashboard', icon: Home },
        { name: 'My Modules', path: '/read-comprehension', icon: FolderKanban },
        { name: 'AI Tools', path: '/ai-tools', icon: Sparkles },
        ...(user?.role === 'admin' ? [{ name: 'Admin', path: '/admin', icon: ShieldCheck }] : []),
    ];

    return (
        <>
            <header className="sticky top-0 z-50 bg-white/75 dark:bg-slate-950/75 backdrop-blur-lg border-b border-slate-100 dark:border-slate-900/80 shadow-premium flex-none">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    
                    {/* Left: Brand */}
                    <div className="flex items-center gap-3">
                        <button 
                            className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-lg"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={20} />
                        </button>
                        <NavLink to="/dashboard" className="flex items-center group">
                            {/* Logo must NOT change between light/dark mode — using original colors always */}
                            <img src="/logo.webp" alt="Aao Seekhe Live" className="h-9 w-auto group-hover:scale-[1.02] transition-transform duration-300" />
                        </NavLink>
                    </div>

                    {/* Center: Desktop Navigation — FULL dark mode support */}
                    <div className="hidden lg:flex items-center gap-1 p-0.5 bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-md rounded-full border border-slate-100 dark:border-slate-800/60">
                        {navLinks.map((link) => {
                            const isActive = location.pathname.startsWith(link.path);
                            return (
                                <NavLink
                                    key={link.name}
                                    to={link.path}
                                    className={`relative px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 flex items-center gap-2 z-10 tracking-wider uppercase ${
                                        isActive 
                                            ? 'text-primary-600 dark:text-primary-400' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="navbar-active-pill"
                                            className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-soft border border-slate-100 dark:border-slate-700/60 -z-10"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <link.icon size={14} className={isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'} />
                                    {link.name}
                                </NavLink>
                            );
                        })}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
                        
                        {/* Theme Toggle */}
                        <button 
                            onClick={toggleTheme} 
                            className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-amber-400 transition-colors p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-900"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Search Cmd+K */}
                        <button 
                            onClick={() => setIsSearchOpen(true)}
                            className="hidden md:flex items-center gap-2 pl-3 pr-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors group dark:bg-slate-900/40 dark:border-slate-850 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-900/80"
                        >
                            <Search size={14} />
                            <span className="text-xs font-semibold pr-8 tracking-wide">Search...</span>
                            <kbd className="hidden lg:inline-block px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-md text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wide">
                                ⌘K
                            </kbd>
                        </button>

                        {/* Notifications */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className="relative text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-900"
                                aria-label="Notifications"
                            >
                                <Bell size={18} />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-950 drop-shadow-sm"></span>
                            </button>
                            <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
                        </div>
                        
                        <div className="relative">
                            <button 
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold shadow-soft border border-primary-100 dark:border-primary-900/30 hover:scale-105 transition-all active:scale-95"
                            >
                                {displayName.charAt(0)?.toUpperCase()}
                            </button>

                            <AnimatePresence>
                                {isProfileDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-slate-100 dark:border-slate-800 z-50 overflow-hidden flex flex-col"
                                        >
                                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{displayName}</p>
                                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 truncate">{user?.email || 'student@aaoseekhe.live'}</p>
                                            </div>
                                            <div className="p-2 flex flex-col gap-1">
                                                <NavLink to="/profile" onClick={() => setIsProfileDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors">
                                                    <User size={16} /> My Profile
                                                </NavLink>
                                                <NavLink to="/settings" onClick={() => setIsProfileDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors">
                                                    <Settings size={16} /> Settings
                                                </NavLink>
                                                <NavLink to="/report" onClick={() => setIsProfileDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors">
                                                    <FolderKanban size={16} /> My Reports
                                                </NavLink>
                                            </div>
                                            <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                                                <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors">
                                                    <LogOut size={16} /> Sign out
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer — Full dark mode */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-slate-900/60 z-[100] lg:hidden backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white dark:bg-slate-900 z-[110] lg:hidden flex flex-col shadow-2xl border-r border-slate-200 dark:border-slate-800"
                        >
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <img src="/logo.webp" alt="Aao Seekhe" className="h-8 w-auto" />
                                </div>
                                <button 
                                    className="p-2 -mr-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
                                <div className="px-3 pb-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Navigation</div>
                                {navLinks.map(link => (
                                    <NavLink
                                        key={link.name}
                                        to={link.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                                            isActive 
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' 
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <link.icon size={20} className={location.pathname.startsWith(link.path) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                                        {link.name}
                                    </NavLink>
                                ))}
                                <div className="px-3 pt-4 pb-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account</div>
                                <NavLink to="/settings" onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <Settings size={20} className="text-slate-400 dark:text-slate-500" /> Settings
                                </NavLink>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Search Modal */}
            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
}

export default Navbar;
