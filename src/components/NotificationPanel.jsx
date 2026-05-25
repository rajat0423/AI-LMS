import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { apiUrl } from '../api';
import { useAuth } from '../context/useAuth';

function NotificationPanel({ isOpen, onClose }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const { token } = useAuth();
    const navigate = useNavigate();
    const panelRef = useRef(null);

    const fetchNotifications = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await fetch(apiUrl('/api/v1/notifications/'), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch {
            // Fallback mock data
            setNotifications([
                { notification_id: '1', title: 'Welcome to AI LMS! 🎉', message: 'Start your learning journey with our AI-powered tools.', notification_type: 'success', is_read: false, link: '/ai-tools', created_at: new Date().toISOString() },
                { notification_id: '2', title: 'Try the AI Interviewer', message: 'Practice mock interviews and get instant AI feedback.', notification_type: 'info', is_read: false, link: '/interview', created_at: new Date().toISOString() },
                { notification_id: '3', title: 'Upload your Resume', message: 'Get your ATS score and keyword analysis in seconds.', notification_type: 'info', is_read: true, link: '/resume', created_at: new Date().toISOString() },
            ]);
            setUnreadCount(2);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen]);

    const markAllRead = async () => {
        try {
            await fetch(apiUrl('/api/v1/notifications/read-all'), {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    };

    const handleClick = (notif) => {
        if (notif.link) {
            navigate(notif.link);
            onClose();
        }
    };

    const typeColors = {
        success: 'bg-emerald-500',
        info: 'bg-indigo-500',
        warning: 'bg-amber-500',
        alert: 'bg-red-500',
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <>
                <div className="fixed inset-0 z-40" onClick={onClose}></div>
                <motion.div
                    ref={panelRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[480px]"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <Bell size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-bold">{unreadCount}</span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                                <CheckCheck size={14} /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading && (
                            <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</div>
                        )}
                        {!isLoading && notifications.length === 0 && (
                            <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 font-medium">
                                No notifications yet
                            </div>
                        )}
                        {!isLoading && notifications.map((notif) => (
                            <button
                                key={notif.notification_id}
                                onClick={() => handleClick(notif)}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800/40 ${
                                    !notif.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                                }`}
                            >
                                <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${!notif.is_read ? typeColors[notif.notification_type] || typeColors.info : 'bg-slate-200 dark:bg-slate-700'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${!notif.is_read ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-medium text-slate-600 dark:text-slate-400'}`}>{notif.title}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1 font-semibold uppercase tracking-wider">{timeAgo(notif.created_at)}</p>
                                </div>
                                {notif.link && <ExternalLink size={12} className="text-slate-300 dark:text-slate-600 mt-1.5 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </>
        </AnimatePresence>
    );
}

export default NotificationPanel;
