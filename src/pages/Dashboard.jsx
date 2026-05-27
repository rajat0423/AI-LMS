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

    const [checklist, setChecklist] = useState([
        { id: 1, text: 'Analyze Resume against target Job Description', completed: false, xp: 100 },
        { id: 2, text: 'Complete your first Reading Comprehension topic quiz', completed: false, xp: 150 },
        { id: 3, text: 'Take a Mock Interview session with the AI Coach', completed: false, xp: 250 },
        { id: 4, text: 'Draft a professional follow-up email', completed: false, xp: 50 },
    ]);

    // Dynamically synchronize daily missions with real database statistics and local storage triggers
    useEffect(() => {
        if (userState?.stats) {
            const hasUploadedResume = (userState.stats.resume_score || 0) > 0;
            const hasCompletedQuiz = (userState.stats.completed_lessons || 0) > 0;
            const hasTakenInterview = !!userState.stats.has_taken_interview;
            const hasDraftedEmail = localStorage.getItem('nlm-has-drafted-email') === 'true';
            
            setChecklist([
                { id: 1, text: 'Analyze Resume against target Job Description', completed: hasUploadedResume, xp: 100 },
                { id: 2, text: 'Complete your first Reading Comprehension topic quiz', completed: hasCompletedQuiz, xp: 150 },
                { id: 3, text: 'Take a Mock Interview session with the AI Coach', completed: hasTakenInterview, xp: 250 },
                { id: 4, text: 'Draft a professional follow-up email', completed: hasDraftedEmail, xp: 50 },
            ]);
        }
    }, [userState]);

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
    const completionPercent = userState?.stats?.completion_percentage    // Harmonized Metric Config matching brand colors (Sleek Professional SaaS Highlights)
    // Dynamic CTA Links render if score is not generated. Audited status labels for absolute readability.
    const metrics = [
        { 
            label: 'Avg Accuracy', 
            val: userState.stats?.avg_accuracy || 0, 
            icon: TrendingUp, 
            color: 'text-primary-600 dark:text-primary-400', 
            bg: 'bg-primary-50 dark:bg-primary-950/20', 
            border: 'border-primary-100 dark:border-primary-900/20',
            status: userState.stats?.avg_accuracy ? 'Active Quiz' : 'No Quizzes',
            statusBg: userState.stats?.avg_accuracy 
                ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/30' 
                : 'bg-slate-100 text-slate-800 dark:bg-slate-850 dark:text-slate-350 border border-slate-200 dark:border-slate-800',
            tip: userState.stats?.avg_accuracy 
                ? 'Excellent readiness! Keep completing quizzes.' 
                : 'Take your first topic quiz to generate accuracy stats!',
            cta: !userState.stats?.avg_accuracy ? { label: 'Start Quiz', path: '/read-comprehension' } : null
        },
        { 
            label: 'Module Accuracy', 
            val: `${userState.stats?.confidence_score || 0}%`, 
            icon: Target, 
            color: 'text-violet-600 dark:text-violet-400', 
            bg: 'bg-violet-50 dark:bg-violet-950/20', 
            border: 'border-violet-100 dark:border-violet-900/20',
            status: userState.stats?.confidence_score > 60 ? 'High Accuracy' : 'Onboarding',
            statusBg: userState.stats?.confidence_score > 60 
                ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30' 
                : 'bg-slate-100 text-slate-800 dark:bg-slate-850 dark:text-slate-350 border border-slate-200 dark:border-slate-800',
            tip: 'Derived from your recent module assessments and quizzes.',
            cta: null
        },
        { 
            label: 'Resume ATS Match', 
            val: userState.stats?.resume_score || 0, 
            icon: FileText, 
            color: 'text-emerald-600 dark:text-emerald-400', 
            bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
            border: 'border-emerald-100 dark:border-emerald-900/20',
            status: userState.stats?.resume_score ? 'ATS Analyzed' : 'Not Uploaded',
            statusBg: userState.stats?.resume_score 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200/50',
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
            col: 'text-primary-600 dark:text-primary-400', 
            bg: 'bg-primary-50 dark:bg-primary-950/20', 
            border: 'border-primary-100 dark:border-primary-900/20',
            badge: 'AI Coach',
            time: '15 mins'
        },
        { 
            label: 'ATS Score Calculator', 
            path: '/resume', 
            desc: 'Scan resume keywords against target Job Descriptions to calculate your match score.', 
            icon: FileText, 
            col: 'text-violet-600 dark:text-violet-400', 
            bg: 'bg-violet-50 dark:bg-violet-950/20', 
            border: 'border-violet-100 dark:border-violet-900/20',
            badge: 'ATS Scanner',
            time: '5 mins'
        },
        { 
            label: 'Email Generator', 
            path: '/email-writer', 
            desc: 'Draft perfect outreach, cold-call, and thank you emails.', 
            icon: Mail, 
            col: 'text-fuchsia-600 dark:text-fuchsia-400', 
            bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20', 
            border: 'border-fuchsia-100 dark:border-fuchsia-900/20',
            badge: 'Outreach',
            time: '2 mins'
        },
        { 
            label: 'Blog & Article Writer', 
            path: '/blog-writer', 
            desc: 'Create high-impact technical articles to boost your profile.', 
            icon: PenTool, 
            col: 'text-emerald-600 dark:text-emerald-400', 
            bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
            border: 'border-emerald-100 dark:border-emerald-900/20',
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="relative z-10 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/30 rounded-full">
                            Command Center
                        </span>
                        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-full border border-rose-100 dark:border-rose-900/20">
                            LIVE ACTIVE
                        </span>
                        <span className="text-xs font-bold text-slate-450 dark:text-slate-400 ml-1">
                            Aao Seekhe Live
                        </span>
                    </div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
                    >
                        Welcome back, <span className="text-gradient-brand">{displayName}</span> 👋
                    </motion.h1>
                    <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-450 max-w-xl font-medium leading-relaxed">
                        Ready to accelerate your career? Continue your personalized journey and complete today's goals.
                    </p>
                </div>

                {/* Live Status indicator */}
                <div className="shrink-0 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/85 px-5 py-3.5 rounded-2xl md:self-center self-start shadow-premium">
                    <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Brand Status</p>
                        <p className="text-xs font-bold text-slate-850 dark:text-slate-100">Aao Seekhe Live Engine</p>
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
                    className="lg:col-span-8 bg-slate-950 dark:bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 text-white relative overflow-hidden shadow-premium border border-slate-900 dark:border-slate-800"
                >
                    {/* Glowing light patterns */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600 rounded-full blur-[140px] opacity-25 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600 rounded-full blur-[120px] opacity-15 translate-y-1/3 -translate-x-1/4 pointer-events-none" />
                    <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

                    <div className="relative z-10 flex flex-col h-full justify-between gap-8 md:gap-12">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
                                <Zap size={12} className="fill-primary-400 text-primary-400" /> Active Stage: Foundation
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-4 font-heading">
                                Mastering Reading Comprehension
                            </h2>
                            <p className="text-slate-350 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
                                Elevate your communication skills with short, interactive passages, context clues, and structured AI response prep. 
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                            <Link
                                to="/read-comprehension"
                                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-950 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-soft shrink-0 w-full sm:w-auto"
                            >
                                Continue Module
                                <ChevronRight size={14} className="text-slate-950 group-hover:translate-x-0.5 transition-transform" />
                            </Link>

                            <div className="w-full sm:max-w-xs flex-1">
                                <div className="flex justify-between text-[10px] font-bold text-white mb-2 uppercase tracking-wider">
                                    <span>Module Progress</span>
                                    <span>{completionPercent}% Completed</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${completionPercent}%` }}
                                        transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.3)]"
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
                    className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium overflow-hidden flex flex-col relative bg-grid-pattern"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-[40px] pointer-events-none" />
                    
                    <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6 relative z-10">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-[10px] uppercase tracking-wider">
                                <Trophy size={14} className="text-primary-600 dark:text-primary-400 animate-bounce" /> Skill Tree Level
                            </h3>
                            <span className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-full uppercase border border-slate-100 dark:border-slate-700/60 tracking-wider">
                                Stage 1 sapling
                            </span>
                        </div>

                        <div className="flex-1 flex items-center justify-center py-4">
                            <div className="w-full max-w-[260px]">
                                <ConsistencyTree streak={streakCount} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-555 uppercase tracking-wider">Rank Tier</span>
                                <span className="font-bold text-sm text-slate-850 dark:text-slate-100">Top 5% Learner</span>
                            </div>
                            <div className="flex flex-col gap-0.5 pl-4 border-l border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-455 dark:text-slate-555 uppercase tracking-wider">Career XP</span>
                                <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
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
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-premium p-6 flex flex-col justify-between h-44 hover:-translate-y-1 hover:shadow-soft hover:border-primary-300 dark:hover:border-primary-800 transition-all duration-300 group"
                    >
                        <div className="flex justify-between items-start">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border border-slate-200/20 ${m.bg} ${m.border} ${m.color} group-hover:scale-105 transition-transform duration-300 shadow-soft`}>
                                <m.icon size={18} />
                            </div>
                            
                            {/* High contrast badge instead of static charts */}
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${m.statusBg}`}>
                                {m.status}
                            </span>
                        </div>
                        
                        <div className="mt-4">
                            <div className="text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-baseline justify-between font-heading">
                                {m.val > 0 ? (
                                    <AnimatedNumber value={parseInt(m.val)} isPercent={String(m.val).includes('%')} />
                                ) : (
                                    <span className="text-base font-bold text-slate-400 dark:text-slate-500">Not Generated</span>
                                )}
                                {m.cta && (
                                    <Link 
                                        to={m.cta.path} 
                                        className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 underline uppercase tracking-wider shrink-0 ml-2"
                                    >
                                        {m.cta.label} →
                                    </Link>
                                )}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-450 dark:text-slate-400">{m.label}</span>
                                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate max-w-[200px]">
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
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium p-6 sm:p-8"
            >
                 <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div>
                        <h3 className="text-sm sm:text-base font-black tracking-widest uppercase text-slate-800 dark:text-white flex items-center gap-2">
                            <Zap size={14} className="text-primary-600 dark:text-primary-400 animate-pulse" /> AI Command Hub
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-450 font-medium mt-1">Select an intelligent module to initialize career optimization.</p>
                    </div>
                    <Link 
                        to="/ai-tools" 
                        className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 uppercase tracking-widest flex items-center gap-1"
                    >
                        Command Center →
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                    {quickActions.map((a, i) => (
                        <Link
                            key={i}
                            to={a.path}
                            className="group flex flex-col justify-between p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-primary-300 dark:hover:border-primary-850 hover:bg-white dark:hover:bg-slate-950 hover:shadow-soft transition-all duration-300"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-soft ${a.bg} ${a.border} ${a.col} group-hover:scale-105 transition-transform`}>
                                        <a.icon size={18} />
                                    </div>
                                    <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-slate-200/40 dark:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-full group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                        {a.badge}
                                    </span>
                                </div>
                                
                                <div>
                                    <span className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors block leading-tight font-heading">
                                        {a.label}
                                    </span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                                        {a.desc}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-6 border-t border-slate-200/20 dark:border-slate-800/20 pt-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
                    className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium p-6 sm:p-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-800 dark:text-white flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-primary-600 dark:text-primary-400" /> Daily Career Missions
                            </h3>
                            <p className="text-xs text-slate-550 dark:text-slate-450 font-medium mt-1">Cross off these tasks to earn career experience points.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                                        ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/20 text-emerald-800/70 dark:text-emerald-350/60 line-through' 
                                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-205 hover:border-primary-200 dark:hover:border-primary-900 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 shadow-xs'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                    item.completed 
                                        ? 'bg-emerald-550 border-emerald-550 text-white' 
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                }`}>
                                    {item.completed && <CheckCircle2 size={14} className="stroke-[3px]" />}
                                </div>
                                <span className="flex-1 text-sm font-medium leading-normal">{item.text}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 px-2.5 py-0.5 rounded-full ${
                                    item.completed
                                        ? 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border border-primary-100/50 dark:border-primary-900/30'
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
                    className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-premium p-6 sm:p-8 flex flex-col justify-between gap-6"
                >
                    <div>
                        <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                            <Award size={14} className="text-primary-600 dark:text-primary-400" /> Career Milestones
                        </h3>
                        
                        <div className="relative border-l border-slate-100 dark:border-slate-800 pl-5 ml-2.5 space-y-5 py-2">
                            <div className="relative">
                                <span className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950 bg-emerald-500" />
                                <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">2 hours ago</p>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-205 mt-0.5">Assessment calibrated successfully</h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-450 font-medium leading-relaxed mt-0.5">Traits saved and initial scores set for module accuracy.</p>
                            </div>
                            <div className="relative">
                                <span className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950 bg-primary-500" />
                                <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Yesterday</p>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-205 mt-0.5">Joined Aao Seekhe Live platform</h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-450 font-medium leading-relaxed mt-0.5">Onboarded into customized Year 3 curriculum successfully.</p>
                            </div>
                        </div>
                    </div>

                    {(() => {
                        const completedModules = userState?.stats?.completed_modules || 0;
                        const isReportLocked = completedModules < 3;
                        return (
                            <div className={`p-4 rounded-2xl text-white shadow-soft flex items-center justify-between gap-4 mt-2 border ${
                                isReportLocked 
                                    ? 'bg-slate-950/95 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-850 dark:text-slate-350 shadow-soft' 
                                    : 'bg-gradient-to-br from-primary-600 to-primary-850 dark:from-slate-900 dark:to-slate-950 border-primary-500/20'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl backdrop-blur flex items-center justify-center border ${
                                        isReportLocked 
                                            ? 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/20 dark:border-slate-700/50 text-slate-500 dark:text-slate-400' 
                                            : 'bg-white/10 border-white/10 text-white'
                                    }`}>
                                        {isReportLocked 
                                            ? <Lock size={16} />
                                            : <Star size={18} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                                        }
                                    </div>
                                    <div>
                                        <h4 className={`text-xs font-bold leading-tight ${isReportLocked ? 'text-slate-800 dark:text-slate-100' : 'text-white'}`}>
                                            {isReportLocked ? 'Employability Report Locked' : 'Employability Report Ready!'}
                                        </h4>
                                        <p className={`text-[10px] font-semibold mt-0.5 ${isReportLocked ? 'text-slate-500 dark:text-slate-450' : 'text-white/70'}`}>
                                            {isReportLocked 
                                                ? `Complete ${3 - completedModules} more module${3 - completedModules > 1 ? 's' : ''} to unlock` 
                                                : 'Your career readiness report is available'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <Link 
                                    to="/report" 
                                    className={`p-2 rounded-xl border transition-colors font-bold ${
                                        isReportLocked 
                                            ? 'bg-slate-50 border-slate-100 text-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600 cursor-default' 
                                            : 'bg-white/20 hover:bg-white/30 text-white border-white/15'
                                    }`}
                                >
                                    <ChevronRight size={14} />
                                </Link>
                            </div>
                        );
                    })()}
                </motion.div>
            </div>
            
        </div>
    );
}
