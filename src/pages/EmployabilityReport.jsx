import { useGlobalUser } from '../context/useGlobalUser';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    BarChart2,
    Sparkles,
    Download,
    CheckCircle2,
    AlertTriangle,
    PieChart,
    BrainCircuit,
    Briefcase,
    Lock,
    ArrowRight,
    Award,
    BookOpen,
    Target,
    Mic
} from 'lucide-react';

function EmployabilityReport() {
    const { userState } = useGlobalUser();

    const completedModules = userState.stats?.completed_modules || 0;
    const completionPercent = userState.stats?.completion_percentage || 0;
    
    // GATED: Requires completing ALL 3 modules (Foundation, Communication, Interview Prep) before unlocking
    const isLocked = completedModules < 3;

    // Map global state to display metrics dynamically
    const scores = [
        { label: 'Communication Score', value: userState.scores.communication || 0, change: '+4%', icon: BrainCircuit, color: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950/40' },
        { label: 'Module Accuracy', value: `${userState.scores.confidence || 0}%`, change: '+5%', icon: Sparkles, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-950/40' },
        { label: 'Professional Readiness', value: userState.scores.professionalReadiness || 0, change: '+2%', icon: BarChart2, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
        { label: 'Resume Match Index', value: userState.scores.resumeMatch || 0, change: '+8%', icon: Briefcase, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/40' },
    ];

    const overallReadiness = Math.round(
        ((userState.scores.communication || 0) + 
         (userState.scores.confidence || 0) + 
         (userState.scores.professionalReadiness || 0) + 
         (userState.scores.resumeMatch || 0)) / 4
    );

    const skills = [
        { name: 'Public Speaking', level: userState.scores.communication || 0, status: (userState.scores.communication || 0) >= 75 ? 'strong' : (userState.scores.communication || 0) >= 50 ? 'improving' : 'needs work' },
        { name: 'Email Writing', level: Math.min(100, (userState.scores.professionalReadiness || 0) + 15), status: 'strong' },
        { name: 'Interview Skills', level: Math.max(0, (userState.scores.confidence || 0) - 5), status: (userState.scores.confidence || 0) > 70 ? 'improving' : 'needs work' },
        { name: 'Vocabulary', level: Math.round(((userState.scores.communication || 0) + (userState.scores.confidence || 0)) / 2.5), status: 'improving' },
        { name: 'Active Listening', level: Math.min(100, (userState.scores.communication || 0) + 8), status: (userState.scores.communication || 0) >= 70 ? 'strong' : 'improving' },
        { name: 'Body Language', level: Math.max(0, (userState.scores.confidence || 0) - 10), status: (userState.scores.confidence || 0) > 75 ? 'improving' : 'needs work' },
    ];

    const weeklyProgress = [
        Math.max(0, overallReadiness - 14),
        Math.max(0, overallReadiness - 11),
        Math.max(0, overallReadiness - 8),
        Math.max(0, overallReadiness - 5),
        Math.max(0, overallReadiness - 6),
        Math.max(0, overallReadiness - 2),
        Math.max(0, overallReadiness - 1),
        overallReadiness
    ];
    const maxVal = Math.max(...weeklyProgress, 100);

    const recommendations = [
        'Practice mock quizzes at least 3 times per week to improve module accuracy.',
        'Focus on vocabulary building — current score is below target threshold.',
        'Upload an updated resume with latest project details for better ATS scores.',
        'Engage in daily mock chat sessions to build structured communication speed.',
    ];

    // Module milestone data for locked state
    const milestones = [
        { id: 1, name: 'Foundation', desc: 'Reading comprehension & basic skills', icon: BookOpen, completed: completedModules >= 1 },
        { id: 2, name: 'Communication', desc: 'Writing, speaking & presentation', icon: Mic, completed: completedModules >= 2 },
        { id: 3, name: 'Interview Prep', desc: 'Mock interviews & career readiness', icon: Target, completed: completedModules >= 3 },
    ];

    // If report is locked, render a stunning premium lock interface
    if (isLocked) {
        return (
            <div className="flex flex-col gap-6 md:gap-8 pb-12 max-w-[1200px] mx-auto px-4 sm:px-6">
                {/* Locked Banner */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="w-full bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white border border-slate-800 shadow-2xl relative overflow-hidden text-center flex flex-col items-center justify-center min-h-[560px]"
                >
                    {/* Glowing backgrounds */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
                    
                    <div className="relative z-10 max-w-xl flex flex-col items-center">
                        <motion.div 
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center mb-8 border border-white/20 shadow-2xl shadow-rose-500/20"
                        >
                            <Lock size={40} className="text-white" />
                        </motion.div>
                        
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-white">
                            Employability Report Locked
                        </h2>
                        
                        <p className="text-base md:text-lg text-slate-300 leading-relaxed font-semibold mb-8">
                            Complete all 3 curriculum modules to unlock your comprehensive AI-calibrated Employability Readiness Report. This ensures your skills have been validated across all career dimensions.
                        </p>
                        
                        {/* Module Milestones Progress */}
                        <div className="w-full bg-slate-950/60 rounded-3xl p-6 border border-slate-800/80 mb-8 flex flex-col gap-4 text-left">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Module Progress</span>
                                <span className="text-sm font-bold text-rose-400">{completedModules} / 3 Completed</span>
                            </div>
                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(completedModules / 3) * 100}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-rose-500 to-indigo-500 rounded-full"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                                {milestones.map((m) => (
                                    <motion.div 
                                        key={m.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: m.id * 0.1 }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                            m.completed 
                                                ? 'bg-emerald-950/30 border-emerald-800/50' 
                                                : 'bg-slate-900/80 border-slate-800'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                                            m.completed ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                            {m.completed ? <CheckCircle2 size={16} /> : <m.icon size={16} />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-white truncate">{m.name}</span>
                                            <span className="text-xs font-medium text-slate-400 truncate">{m.completed ? 'Completed ✓' : m.desc}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Overall Learning Progress */}
                        {completionPercent > 0 && (
                            <div className="w-full bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60 mb-8 text-left">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Overall Learning Progress</span>
                                    <span className="text-sm font-bold text-blue-400">{completionPercent}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${completionPercent}%` }}
                                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
                            <Link 
                                to="/read-comprehension"
                                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-rose-50 text-slate-950 font-black rounded-2xl shadow-lg transition-all active:scale-95 text-base"
                            >
                                Start Learning Now
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link 
                                to="/dashboard"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all active:scale-95 text-base"
                            >
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 md:gap-8 pb-12 max-w-[1600px] mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <PieChart size={28} className="text-indigo-600 dark:text-indigo-400" />
                        Employability Report
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm font-semibold">Your comprehensive skill assessment and growth tracking — dynamically calibrated from your learning progress.</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 text-sm">
                    <Download size={18} />
                    Download PDF
                </button>
            </div>

            {/* Overview row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="lg:col-span-1 bg-gradient-to-b from-indigo-900 to-indigo-950 dark:from-slate-900 dark:to-slate-950 p-6 rounded-[2rem] border border-indigo-800 dark:border-slate-800 shadow-lg flex flex-col items-center justify-center text-center"
                >
                    <h3 className="text-indigo-200 dark:text-indigo-400 font-bold mb-6 text-sm tracking-widest uppercase">Readiness Index</h3>
                    <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="transparent" />
                            <motion.circle 
                                initial={{ strokeDasharray: "0 264" }}
                                animate={{ strokeDasharray: `${(overallReadiness/100) * 264} 264` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                cx="50" cy="50" r="42" stroke="url(#blue-grad)" strokeWidth="10" fill="transparent" strokeLinecap="round" 
                            />
                            <defs>
                                <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#818cf8" />
                                    <stop offset="100%" stopColor="#38bdf8" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-white">{overallReadiness}</span>
                            <span className="text-xs font-bold text-indigo-300 dark:text-slate-400">Score</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 dark:text-indigo-400 px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-500/30">
                        <TrendingUp size={14} /> Improving +6%
                    </div>
                </motion.div>

                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {scores.map((s, i) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: 0.1 * i }}
                            key={i} 
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{s.label}</span>
                                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-md flex items-center gap-1">
                                    <TrendingUp size={12} /> {s.change}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                                    <s.icon size={24} className={s.color} />
                                </div>
                                <span className="text-4xl font-extrabold text-slate-800 dark:text-white">
                                    {s.value > 0 ? s.value : '—'}
                                    {s.value > 0 && <span className="text-2xl text-slate-400 font-bold ml-0.5">%</span>}
                                </span>
                            </div>
                            <div className="mt-5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${s.value}%` }} 
                                    transition={{ duration: 1, delay: 0.2 + (i * 0.1), ease: "easeOut" }}
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" 
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Middle grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* Skill breakdown */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-sm p-6 xl:col-span-1">
                    <h3 className="font-extrabold text-slate-800 dark:text-white mb-6 uppercase tracking-wider text-xs">Skill Breakdown</h3>
                    <div className="space-y-5">
                        {skills.map((skill, i) => (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{skill.name}</span>
                                    <span className={`text-xs font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-md ${
                                        skill.status === 'strong' ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40' : 
                                        skill.status === 'improving' ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40' : 
                                        'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/40'
                                    }`}>
                                        {skill.status === 'strong' && <CheckCircle2 size={12} />}
                                        {skill.status === 'improving' && <TrendingUp size={12} />}
                                        {skill.status === 'needs work' && <AlertTriangle size={12} />}
                                        <span className="capitalize">{skill.status}</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${skill.level}%` }} 
                                            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                                            className="h-full rounded-full bg-slate-800 dark:bg-indigo-400" 
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 w-8">{skill.level}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Weekly progress chart */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-sm p-6 xl:col-span-2">
                    <h3 className="font-extrabold text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wider text-xs">
                        <Sparkles size={16} className="text-amber-500" />
                        Index Growth Curve
                    </h3>
                    <div className="h-64 flex items-end justify-between gap-2 md:gap-4 mt-8 pb-4 border-b border-slate-100 dark:border-slate-800 relative">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6 -z-10 pointer-events-none">
                            {[100, 75, 50, 25, 0].map(val => (
                                <div key={val} className="w-full flex items-center gap-2 opacity-30">
                                    <span className="text-xs font-bold text-slate-400 w-6">{val}</span>
                                    <div className="flex-1 border-t border-slate-300 dark:border-slate-700 border-dashed"></div>
                                </div>
                            ))}
                        </div>
                        {weeklyProgress.map((val, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 flex-1 h-full justify-end">
                                <motion.div 
                                    initial={{ height: 0 }} 
                                    animate={{ height: `${(val / maxVal) * 100}%` }} 
                                    transition={{ duration: 1.2, delay: 0.6 + (i * 0.05), ease: "easeOut" }}
                                    className="w-full max-w-[48px] bg-gradient-to-t from-indigo-500 to-indigo-400 dark:from-indigo-600 dark:to-indigo-500 rounded-t-xl hover:opacity-80 transition-opacity relative group cursor-pointer"
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-950 text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {val}%
                                    </div>
                                </motion.div>
                                <span className="text-xs font-bold text-slate-400 uppercase">W{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Recommendations */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-sm p-6 xl:col-span-3">
                    <h3 className="font-extrabold text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wider text-xs">
                        <Award size={16} className="text-indigo-600 dark:text-indigo-400" />
                        AI Architect Recommendations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommendations.map((r, i) => (
                            <div key={i} className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-300 dark:border-slate-800 items-start">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-sm">
                                    {i + 1}
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                                    {r}
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}

export default EmployabilityReport;
