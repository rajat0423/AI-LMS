import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useGlobalUser } from '../context/useGlobalUser';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '../components/BackButton';
import {
    UserCircle,
    Mail,
    Award,
    Zap,
    Trophy,
    Target,
    Mic,
    Briefcase,
    TrendingUp,
    FileText,
    Sparkles,
    CheckCircle2,
    Lock,
    Edit3,
    Check,
    ArrowRight,
    Calendar,
    Clock,
    BarChart3
} from 'lucide-react';
import ConsistencyTree from '../components/ConsistencyTree';

// Reusable hook for animated numbers with easeOutExpo
function AnimatedNumber({ value, duration = 1.5, isPercent }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeProgress * value));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [value, duration]);

    return <span>{count}{isPercent ? '%' : ''}</span>;
}

export default function Profile() {
    const { user } = useAuth();
    const { userState } = useGlobalUser();

    // 1. Bio / Objective Interactive State (saved in LocalStorage)
    const [bio, setBio] = useState(() => {
        return localStorage.getItem('nlm-bio') || "Ambitious placement student looking to refine technical communication, tailor my resume to ATS benchmarks, and crack mock interviews at top-tier product companies.";
    });
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [tempBio, setTempBio] = useState(bio);
    const [showSuccessToast, setShowSuccessToast] = useState(false);


    // 3. Last active timestamp
    const [lastActive] = useState(() => {
        const stored = localStorage.getItem('nlm-last-active');
        const now = new Date().toISOString();
        localStorage.setItem('nlm-last-active', now);
        return stored || now;
    });

    const handleSaveBio = () => {
        setBio(tempBio);
        localStorage.setItem('nlm-bio', tempBio);
        setIsEditingBio(false);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };


    const displayName = userState?.name || user?.name || 'Student';
    const email = user?.email || 'student@aaoseekhe.live';
    const streakCount = userState?.streakCount || 0;
    const completedLessons = userState?.stats?.completed_lessons || 0;
    const totalLessons = userState?.stats?.total_lessons || 0;
    const completionPercentage = userState?.stats?.completion_percentage || 0;
    const completedModules = userState?.stats?.completed_modules || 0;

    // Dynamic skill computation from actual user scores
    const commScore = userState?.scores?.communication || 0;
    const confScore = userState?.scores?.confidence || 0;
    const profScore = userState?.scores?.professionalReadiness || 0;
    const resumeScore = userState?.scores?.resumeMatch || 0;


    // Dynamic XP Calculation
    const dynamicXp = (completedLessons * 150) + (streakCount * 50) + commScore + confScore + profScore + resumeScore;

    let rankLabel = "Top 50%";
    if (dynamicXp > 3000) rankLabel = "Top 1%";
    else if (dynamicXp > 1500) rankLabel = "Top 5%";
    else if (dynamicXp > 800) rankLabel = "Top 10%";
    else if (dynamicXp > 300) rankLabel = "Top 25%";

    let yearLabel = "Year 1 Foundation";
    if (completionPercentage > 75) yearLabel = "Year 4 Industry Ready";
    else if (completionPercentage > 50) yearLabel = "Year 3 Career Prep";
    else if (completionPercentage > 25) yearLabel = "Year 2 Communication";

    // Format relative time
    const getRelativeTime = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8 min-h-screen">
            <BackButton />
            
            {/* Dynamic Bio Saving Notification (Toast) */}
            <AnimatePresence>
                {showSuccessToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-24 right-4 sm:right-8 z-50 bg-emerald-500 text-white font-bold px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400"
                    >
                        <CheckCircle2 size={20} className="text-white fill-emerald-600" />
                        <span>Profile biography saved successfully!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Hero Block - Rich Premium Aesthetics */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden border border-slate-800"
            >
                {/* Visual glows */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left justify-between w-full">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start flex-1">
                        {/* Avatar with completion ring */}
                        <div className="relative shrink-0">
                            <div className="w-32 h-32 md:w-36 md:h-36 rounded-[2.5rem] bg-gradient-to-tr from-indigo-600 via-violet-600 to-indigo-800 shadow-2xl flex items-center justify-center border-4 border-slate-800">
                                <span className="text-5xl font-black text-white">{displayName.charAt(0)}</span>
                            </div>
                            {/* Completion ring indicator */}
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center">
                                <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#818cf8" strokeWidth="3"
                                        strokeDasharray={`${(completionPercentage / 100) * 88} 88`}
                                        strokeLinecap="round" />
                                </svg>
                                <span className="absolute text-[9px] font-bold text-indigo-300">{completionPercentage}%</span>
                            </div>
                        </div>
                        
                        <div className="flex-grow flex flex-col gap-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">{displayName}</h1>
                                <p className="text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2 mt-2 text-sm">
                                    <Mail size={14} /> {email}
                                </p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2.5 justify-center md:justify-start mt-1">
                                <div className="px-3.5 py-2 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center gap-2 text-sm font-bold shadow-xs">
                                    <Award size={14} className="text-blue-400" />
                                    <span>{dynamicXp >= 1000 ? (dynamicXp / 1000).toFixed(1) + 'k' : dynamicXp} XP</span>
                                </div>
                                <div className="px-3.5 py-2 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center gap-2 text-sm font-bold shadow-xs">
                                    <Target size={14} className="text-emerald-400" />
                                    <span>{yearLabel}</span>
                                </div>
                                <div className="px-3.5 py-2 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center gap-2 text-sm font-bold shadow-xs">
                                    <Clock size={14} className="text-slate-400" />
                                    <span>Active {getRelativeTime(lastActive)}</span>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Dynamic Stats Bar */}
                <div className="relative z-10 mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <div className="flex flex-col items-center sm:items-start gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lessons</span>
                        <span className="text-xl font-black text-white"><AnimatedNumber value={completedLessons} /><span className="text-sm text-slate-500 font-bold">/{totalLessons}</span></span>
                    </div>
                    <div className="flex flex-col items-center sm:items-start gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Streak</span>
                        <span className="text-xl font-black text-white"><AnimatedNumber value={streakCount} /> <span className="text-sm text-slate-500 font-bold">days</span></span>
                    </div>
                    <div className="flex flex-col items-center sm:items-start gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modules</span>
                        <span className="text-xl font-black text-white"><AnimatedNumber value={completedModules} /><span className="text-sm text-slate-500 font-bold">/3</span></span>
                    </div>
                    <div className="flex flex-col items-center sm:items-start gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                        <span className="text-xl font-black text-white"><AnimatedNumber value={completionPercentage} isPercent /></span>
                    </div>
                </div>
            </motion.div>

            {/* Interactive Biography & Career Goals */}
            <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
                
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-extrabold text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                        <Edit3 size={16} className="text-indigo-600 dark:text-indigo-400" /> Biography & Career Goal
                    </h3>
                    {!isEditingBio ? (
                        <button 
                            onClick={() => { setTempBio(bio); setIsEditingBio(true); }}
                            className="flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Edit3 size={12} /> Edit Bio
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveBio}
                                className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-700 transition-colors"
                            >
                                <Check size={12} /> Save
                            </button>
                            <button 
                                onClick={() => setIsEditingBio(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                {!isEditingBio ? (
                    <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-medium italic">
                        "{bio}"
                    </p>
                ) : (
                    <textarea 
                        value={tempBio}
                        onChange={(e) => setTempBio(e.target.value)}
                        rows={3}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-100 font-medium transition-all text-sm sm:text-base"
                        placeholder="Define your dream role and target industries..."
                    />
                )}
            </motion.div>

            {/* Learning Consistency Full Width Card */}
            <div className="w-full">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-300 dark:border-slate-800 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[40px] pointer-events-none" />
                    
                    <div className="flex-1 flex flex-col justify-between gap-6 self-stretch">
                        <div>
                            <h2 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-2">
                                <Zap className="text-amber-500 fill-amber-500 animate-pulse" size={16} /> Learning Consistency
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                                Keep completing topic quizzes to grow your sapling tree.
                            </p>
                        </div>
                        
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                            <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Active Consistency Streak</span>
                            <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{streakCount} Days</h4>
                        </div>
                    </div>
                    
                    <div className="w-full max-w-[280px] shrink-0 flex items-center justify-center py-4">
                        <ConsistencyTree streak={streakCount} />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
