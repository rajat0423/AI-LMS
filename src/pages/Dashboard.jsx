import { useAuth } from '../context/useAuth';
import { useGlobalUser } from '../context/useGlobalUser';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Mail,
    TrendingUp,
    Target,
    Zap,
    Trophy,
    PenTool,
    Sparkles,
    BookOpen,
    Clock,
    CheckCircle2,
    ChevronRight,
    Award,
    Star,
    BarChart3,
    Lock
} from 'lucide-react';
import InitialAssessmentWizard from '../components/InitialAssessmentWizard';
import ConsistencyTree from '../components/ConsistencyTree';
import { useState, useEffect } from 'react';

// Animated Counter Component with easeOutExpo animation
function AnimatedNumber({ value, duration = 1.5, isPercent, suffix = "" }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let startTimestamp = null;
        const step = (ts) => {
            if (!startTimestamp) startTimestamp = ts;
            const progress = Math.min((ts - startTimestamp) / (duration * 1000), 1);
            const ease = 1 - Math.pow(1 - progress, 4); // easeOutExpo
            setCount(Math.floor(ease * value));
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }, [value, duration]);
    return <span>{count}{isPercent ? '%' : ''}{suffix}</span>;
}

export default function Dashboard() {
    const { user } = useAuth();
    const { userState } = useGlobalUser();

    // Local state for interactive checklist
    const [checklist, setChecklist] = useState([
        { id: 1, text: 'Analyze Resume against target Job Description', completed: false, xp: 100 },
        { id: 2, text: 'Complete your first Reading Comprehension topic quiz', completed: true, xp: 150 },
        { id: 3, text: 'Take a Mock Interview session with the AI Coach', completed: false, xp: 250 },
        { id: 4, text: 'Draft a professional follow-up email', completed: false, xp: 50 },
    ]);

    // State for interactive notification or tips
    const [activeTip, setActiveTip] = useState(0);
    const tips = [
        "🔥 Pro Tip: Grow your Consistency Tree by logging in and completing today's daily career missions.",
        "✨ AI Optimizer: Update your target role in the AI Interviewer to dynamically calibrate LLaMA's interview questions.",
        "📈 ATS Strategy: Reach at least an 80% Resume ATS Match to significantly boost interview shortlist rates."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTip((prev) => (prev + 1) % tips.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [tips.length]);

    if (!userState.hasTakenAssessment) {
        return <InitialAssessmentWizard />;
    }

    const displayName = userState?.name || user?.name || 'Student';
    
    // BACKEND-INTEGRATED DYNAMIC DATA
    const streakCount = userState?.streakCount || 0;
    const completionPercent = userState?.stats?.completion_percentage || 0;

    // Harmonized Metric Config matching brand colors (Royal Blue / Crimson Red / Emerald green highlights)
    // Dynamic CTA Links render if score is not generated. Audited status labels for absolute readability.
    const metrics = [
        { 
            label: 'Avg Accuracy', 
            val: userState.stats?.avg_accuracy || 0, 
            icon: TrendingUp, 
            color: 'text-blue-700 dark:text-blue-400', 
            bg: 'bg-blue-50 dark:bg-blue-950/40', 
            border: 'border-blue-200 dark:border-blue-900/40',
            status: userState.stats?.avg_accuracy ? 'Active Quiz' : 'No Quizzes',
            statusBg: userState.stats?.avg_accuracy 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' 
                : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
            tip: userState.stats?.avg_accuracy 
                ? 'Excellent readiness! Keep completing quizzes.' 
                : 'Take your first topic quiz to generate accuracy stats!',
            cta: !userState.stats?.avg_accuracy ? { label: 'Start Quiz', path: '/read-comprehension' } : null
        },
        { 
            label: 'Module Accuracy', 
            val: `${userState.stats?.confidence_score || 0}%`, 
            icon: Target, 
            color: 'text-rose-700 dark:text-rose-400', 
            bg: 'bg-rose-50 dark:bg-rose-950/40', 
            border: 'border-rose-200 dark:border-rose-900/40',
            status: userState.stats?.confidence_score > 60 ? 'High Accuracy' : 'Onboarding',
            statusBg: userState.stats?.confidence_score > 60 
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' 
                : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
            tip: 'Derived from your recent module assessments and quizzes.',
            cta: null
        },
        { 
            label: 'Resume ATS Match', 
            val: userState.stats?.resume_score || 0, 
            icon: FileText, 
            color: 'text-emerald-700 dark:text-emerald-400', 
            bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
            border: 'border-emerald-200 dark:border-emerald-900/40',
            status: userState.stats?.resume_score ? 'ATS Analyzed' : 'Not Uploaded',
            statusBg: userState.stats?.resume_score 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' 
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50',
            tip: userState.stats?.resume_score 
                ? 'Add active keywords to push score above 85%.' 
                : 'Analyze your resume to generate ATS match stats!',
            cta: !userState.stats?.resume_score ? { label: 'Analyze Resume', path: '/resume' } : null
        }
    ];

    // AI Tools Hub configured with cohesive brand styling and high-contrast texts
    const quickActions = [
        { 
            label: 'Mock Interviewer', 
            path: '/interview', 
            desc: 'Simulate a live technical or HR mock session.', 
            icon: Target, 
            col: 'text-blue-700 dark:text-blue-400', 
            bg: 'bg-blue-50 dark:bg-blue-950/30', 
            border: 'border-blue-200 dark:border-blue-900/40',
            badge: 'AI Coach',
            time: '15 mins'
        },
        { 
            label: 'Resume Optimizer', 
            path: '/resume', 
            desc: 'Scan resume keywords against target Job Descriptions.', 
            icon: FileText, 
            col: 'text-indigo-700 dark:text-indigo-400', 
            bg: 'bg-indigo-50 dark:bg-indigo-950/30', 
            border: 'border-indigo-200 dark:border-indigo-900/40',
            badge: 'ATS Scanner',
            time: '5 mins'
        },
        { 
            label: 'Email Generator', 
            path: '/email-writer', 
            desc: 'Draft perfect outreach, cold-call, and thank you emails.', 
            icon: Mail, 
            col: 'text-rose-700 dark:text-rose-400', 
            bg: 'bg-rose-50 dark:bg-rose-950/30', 
            border: 'border-rose-200 dark:border-rose-900/40',
            badge: 'Outreach',
            time: '2 mins'
        },
        { 
            label: 'Blog & Article Writer', 
            path: '/blog-writer', 
            desc: 'Create high-impact technical articles to boost your profile.', 
            icon: PenTool, 
            col: 'text-emerald-700 dark:text-emerald-400', 
            bg: 'bg-emerald-50 dark:bg-emerald-950/30', 
            border: 'border-emerald-200 dark:border-emerald-900/40',
            badge: 'SaaS Creator',
            time: '10 mins'
        },
    ];

    const toggleChecklistItem = (id) => {
        setChecklist(prev => prev.map(item => 
            item.id === id ? { ...item, completed: !item.completed } : item
        ));
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 flex flex-col gap-6 md:gap-8 min-h-screen">
            
            {/* Header: Warm welcome with brand royal blue coordinates & High contrast texts */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 border border-slate-300 dark:border-slate-800 shadow-[0_4px_25px_rgba(0,0,0,0.03)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="relative z-10 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-blue-700 text-white rounded-full">
                            Command Center
                        </span>
                        <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 rounded-full border border-rose-200 dark:border-rose-900/40">
                            LIVE ACTIVE
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 ml-1">
                            Aao Seekhe Live
                        </span>
                    </div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
                    >
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-rose-700 dark:from-blue-400 dark:via-indigo-400 dark:to-rose-400">{displayName}</span> 👋
                    </motion.h1>
                    <p className="mt-3 text-base sm:text-lg text-slate-700 dark:text-slate-300 max-w-xl font-medium leading-relaxed">
                        Ready to accelerate your career? Continue your personalized journey and complete today's goals.
                    </p>
                </div>

                {/* Live Status indicator */}
                <div className="shrink-0 flex items-center gap-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700/60 px-5 py-4 rounded-2xl md:self-center self-start shadow-sm">
                    <div className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Brand Status</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Aao Seekhe Live Engine</p>
                    </div>
                </div>
            </div>

            {/* AI Tips Ticker - Carousel effect in High Contrast Background */}
            <div className="bg-rose-100/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-xs">
                <Sparkles className="text-rose-700 dark:text-rose-400 shrink-0 animate-pulse" size={18} />
                <div className="overflow-hidden relative h-5 flex-1">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={activeTip}
                            initial={{ y: 15, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -15, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm sm:text-base font-medium text-rose-950 dark:text-rose-200 leading-relaxed truncate"
                        >
                            {tips[activeTip]}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>

            {/* BENTO GRID LEVEL 1: Primary Module Hero + Consistency Tree */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                
                {/* Hero / Active Learning Progress - 8 cols (Vibrant Royal Blue Gradient with maximized contrast text) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05, duration: 0.4 }}
                    className="lg:col-span-8 bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950 dark:from-slate-900 dark:via-blue-950/60 dark:to-slate-950 rounded-[2rem] p-6 sm:p-8 md:p-10 text-white relative overflow-hidden shadow-xl border border-blue-500/20"
                >
                    {/* Glowing light patterns */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[140px] opacity-25 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-600 rounded-full blur-[120px] opacity-15 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

                    <div className="relative z-10 flex flex-col h-full justify-between gap-8 md:gap-12">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
                                <Zap size={12} className="fill-blue-400 text-blue-400" /> Active Stage: Foundation
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-4">
                                Mastering Reading Comprehension
                            </h2>
                            <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
                                Elevate your communication skills with short, interactive passages, context clues, and structured AI response prep. 
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                            <Link
                                to="/read-comprehension"
                                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-rose-50 text-slate-900 font-bold rounded-2xl text-sm transition-all active:scale-95 shadow-md shrink-0 w-full sm:w-auto"
                            >
                                Continue Module
                                <ChevronRight size={16} className="text-slate-900 group-hover:translate-x-0.5 transition-transform" />
                            </Link>

                            <div className="w-full sm:max-w-xs flex-1">
                                <div className="flex justify-between text-xs font-bold text-white mb-2 uppercase tracking-wider">
                                    <span>Module Progress</span>
                                    <span>{completionPercent}% Completed</span>
                                </div>
                                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${completionPercent}%` }}
                                        transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-blue-400 to-rose-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Gamified Consistency Tree & Streak - 4 cols */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[40px] pointer-events-none" />
                    
                    <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2 text-xs uppercase tracking-widest">
                                <Trophy size={16} className="text-rose-600 animate-bounce" /> Skill Tree Level
                            </h3>
                            <span className="text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Stage 1 sapling
                            </span>
                        </div>

                        <div className="flex-1 flex items-center justify-center py-4">
                            <div className="w-full max-w-[260px]">
                                <ConsistencyTree streak={streakCount} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/40">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rank Tier</span>
                                <span className="font-bold text-base text-slate-900 dark:text-slate-100">Top 5% Learner</span>
                            </div>
                            <div className="flex flex-col gap-0.5 pl-4 border-l border-slate-300 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Career XP</span>
                                <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                                    <AnimatedNumber value={streakCount > 0 ? streakCount * 150 : 0} duration={2} suffix=" XP" />
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* BENTO GRID LEVEL 2: Metric Row with Animated Bold High-Contrast Text (All static charts and circular progress rings removed) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {metrics.map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + 0.05 * i }}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800/80 shadow-sm p-6 flex flex-col justify-between h-44 hover:-translate-y-1 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-900/60 transition-all duration-300 group"
                    >
                        <div className="flex justify-between items-start">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-200/50 ${m.bg} ${m.border} ${m.color} group-hover:scale-105 transition-transform duration-300`}>
                                <m.icon size={22} />
                            </div>
                            
                            {/* High contrast badge instead of static charts */}
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${m.statusBg}`}>
                                {m.status}
                            </span>
                        </div>
                        
                        <div className="mt-4">
                            <div className="text-4xl font-black text-slate-950 dark:text-white tracking-tight flex items-baseline justify-between">
                                {m.val > 0 ? (
                                    <AnimatedNumber value={m.val} isPercent />
                                ) : (
                                    <span className="text-xl font-bold text-slate-400 dark:text-slate-500">Not Generated</span>
                                )}
                                {m.cta && (
                                    <Link 
                                        to={m.cta.path} 
                                        className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 underline uppercase tracking-wider shrink-0 ml-2"
                                    >
                                        {m.cta.label} →
                                    </Link>
                                )}
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="text-sm font-bold tracking-wider uppercase text-slate-800 dark:text-slate-200">{m.label}</span>
                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {m.tip}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* BENTO GRID LEVEL 3: AI Command Suite & Quick Launchpad */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-300 dark:border-slate-800 shadow-sm p-6 sm:p-8"
            >
                 <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div>
                        <h3 className="text-base sm:text-lg font-black tracking-widest uppercase text-slate-800 dark:text-white flex items-center gap-2">
                            <Zap size={16} className="text-blue-700 dark:text-blue-400" /> AI Command Hub
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-1">Select an intelligent module to initialize career optimization.</p>
                    </div>
                    <Link 
                        to="/ai-tools" 
                        className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 uppercase tracking-widest flex items-center gap-1"
                    >
                        Command Center →
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                    {quickActions.map((a, i) => (
                        <Link
                            key={i}
                            to={a.path}
                            className="group flex flex-col justify-between p-6 rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-blue-400 dark:hover:border-blue-900 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md transition-all duration-300"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${a.bg} ${a.border} ${a.col} group-hover:scale-105 transition-transform`}>
                                        <a.icon size={22} />
                                    </div>
                                    <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full group-hover:bg-blue-700 group-hover:text-white transition-colors">
                                        {a.badge}
                                    </span>
                                </div>
                                
                                <div>
                                    <span className="font-extrabold text-lg text-slate-950 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors block leading-tight">
                                        {a.label}
                                    </span>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                                        {a.desc}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-6 border-t border-slate-200/60 dark:border-slate-800/40 pt-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <Clock size={12} />
                                <span>Takes {a.time}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </motion.div>

            {/* BENTO GRID LEVEL 4: Learning Checklist (Active Goals) & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                
                {/* Daily Checklist - 7 cols */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-300 dark:border-slate-800 shadow-sm p-6 sm:p-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm sm:text-base font-black tracking-widest uppercase text-slate-800 dark:text-white flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-blue-700 dark:text-blue-400" /> Daily Career Missions
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-1">Cross off these tasks to earn career experience points.</p>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                            {checklist.filter(item => item.completed).length} / {checklist.length} Completed
                        </span>
                    </div>

                    <div className="flex flex-col gap-3">
                        {checklist.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => toggleChecklistItem(item.id)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                                    item.completed 
                                        ? 'bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-900/30 text-emerald-900/90 dark:text-emerald-300/80 line-through' 
                                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-300/80 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                    item.completed 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                                }`}>
                                    {item.completed && <CheckCircle2 size={14} className="stroke-[3px]" />}
                                </div>
                                <span className="flex-1 text-sm sm:text-base font-medium leading-normal">{item.text}</span>
                                <span className={`text-xs font-bold uppercase tracking-wider shrink-0 px-2.5 py-0.5 rounded-full ${
                                    item.completed
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                }`}>
                                    +{item.xp} XP
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Recent activity & Career milestone - 5 cols */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-300 dark:border-slate-800 shadow-sm p-6 sm:p-8 flex flex-col justify-between gap-6"
                >
                    <div>
                        <h3 className="text-sm sm:text-base font-black tracking-widest uppercase text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                            <Award size={16} className="text-blue-700 dark:text-blue-400" /> Career Milestones
                        </h3>
                        
                        <div className="relative border-l border-slate-200 dark:border-slate-800 pl-5 ml-2.5 space-y-5 py-2">
                            <div className="relative">
                                <span className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">2 hours ago</p>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 mt-0.5">Assessment calibrated successfully</h4>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-0.5">Traits saved and initial scores set for module accuracy.</p>
                            </div>
                            <div className="relative">
                                <span className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500" />
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Yesterday</p>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 mt-0.5">Joined Aao Seekhe Live platform</h4>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-0.5">Onboarded into customized Year 3 curriculum successfully.</p>
                            </div>
                        </div>
                    </div>

                    {(() => {
                        const completedModules = userState?.stats?.completed_modules || 0;
                        const isReportLocked = completedModules < 3;
                        return (
                            <div className={`p-5 rounded-2xl text-white shadow-sm flex items-center justify-between gap-4 mt-2 border ${
                                isReportLocked 
                                    ? 'bg-gradient-to-br from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 border-slate-600/30' 
                                    : 'bg-gradient-to-br from-blue-700 to-blue-900 dark:from-blue-700 dark:to-blue-900 border-blue-600/30'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl backdrop-blur flex items-center justify-center border ${
                                        isReportLocked ? 'bg-white/5 border-white/10' : 'bg-white/10 border-white/10'
                                    }`}>
                                        {isReportLocked 
                                            ? <Lock size={18} className="text-slate-300" />
                                            : <Star size={20} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                                        }
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold leading-tight">
                                            {isReportLocked ? 'Employability Report Locked' : 'Employability Report Ready!'}
                                        </h4>
                                        <p className="text-xs font-semibold text-white/70 mt-0.5">
                                            {isReportLocked 
                                                ? `Complete ${3 - completedModules} more module${3 - completedModules > 1 ? 's' : ''} to unlock` 
                                                : 'Your career readiness report is available'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <Link 
                                    to="/report" 
                                    className={`p-2.5 rounded-xl border transition-colors font-bold ${
                                        isReportLocked 
                                            ? 'bg-white/10 border-white/10 text-white/50 cursor-default' 
                                            : 'bg-white/20 hover:bg-white/30 text-white border-white/15'
                                    }`}
                                >
                                    <ChevronRight size={16} />
                                </Link>
                            </div>
                        );
                    })()}
                </motion.div>
            </div>
            
        </div>
    );
}
