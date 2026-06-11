import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Mic,
    FileText,
    Mail,
    PenTool,
    Sparkles,
    ArrowRight,
    Zap,
    Briefcase
} from 'lucide-react';
import BackButton from '../components/BackButton';

const aiTools = [
    {
        id: 'mock-interview',
        title: 'Mock Interview',
        description: 'Simulate a realistic live interview with our AI hiring manager.',
        path: '/interview',
        icon: Mic,
        color: 'text-primary-600 dark:text-primary-400',
        bg: 'bg-primary-50 dark:bg-primary-950/20',
        border: 'border-primary-100 dark:border-primary-900/20',
        image: '/interview_coach.png'
    },
    {
        id: 'resume-tailor',
        title: 'AI Custom Resume Generator',
        description: 'Upload your PDF and tailor it to any Job Description using Groq AI with 10 premium single-page style presets.',
        path: '/resume-tailor',
        icon: Briefcase,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-50 dark:bg-violet-950/20',
        border: 'border-violet-100 dark:border-violet-900/20',
        image: '/resume_tailor.png'
    },
    {
        id: 'resume-analyzer',
        title: 'ATS Score Calculator',
        description: 'Scan your resume against any Job Description to calculate your dynamic ATS match score and keyword gaps.',
        path: '/resume',
        icon: FileText,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-950/20',
        border: 'border-indigo-100 dark:border-indigo-900/20',
        image: '/ats_calculator.png'
    },
    {
        id: 'email-writer',
        title: 'Email Generator',
        description: 'Draft the perfect follow-up or cold email instantly.',
        path: '/email-writer',
        icon: Mail,
        color: 'text-fuchsia-600 dark:text-fuchsia-400',
        bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20',
        border: 'border-fuchsia-100 dark:border-fuchsia-900/20',
        image: '/interview_coach.png'
    },
    {
        id: 'blog-writer',
        title: 'Blog Writer',
        description: 'Craft high-quality professional articles or blog posts.',
        path: '/blog-writer',
        icon: PenTool,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        border: 'border-emerald-100 dark:border-emerald-900/20',
        image: '/resume_tailor.png'
    }
];

export default function AiToolsHub() {
    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col">
            <BackButton fallbackPath="/dashboard" />
            <div className="flex flex-col gap-8">

                {/* Hub Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full bg-slate-950 dark:bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-premium border border-slate-900 dark:border-slate-800 relative overflow-hidden bg-grid-pattern bg-opacity-90 group"
                >
                    <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay group-hover:scale-[1.01] transition-transform duration-[800ms] pointer-events-none" style={{ backgroundImage: "url('/dashboard_hero.png')" }} />
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-indigo-950/80 z-0 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-[100px] opacity-25 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-300 text-[10px] font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
                                <Sparkles size={12} className="fill-primary-400" /> AI Command Center
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 font-heading">
                                Supercharge your Career
                            </h1>
                            <p className="text-slate-300 text-base sm:text-lg font-medium leading-relaxed">
                                Access our fully integrated suite of generative AI tools to practice skills, optimize applications, and land your next role.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {aiTools.map((tool, i) => (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.1 * i, duration: 0.4 }}
                            key={tool.id}
                        >
                            <Link
                                to={tool.path}
                                className="group flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-premium p-6 sm:p-8 hover:-translate-y-1 hover:shadow-soft hover:border-primary-200 dark:hover:border-primary-900 transition-all duration-300"
                            >
                                {/* Premium Custom Generated Illustration Header */}
                                <div className="relative h-44 rounded-2xl overflow-hidden mb-6 border border-slate-100 dark:border-slate-800 shadow-inner">
                                    <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: `url('${tool.image}')` }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-transparent" />
                                </div>

                                <div className="flex items-start justify-between mb-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-soft ${tool.bg} ${tool.border} ${tool.color} group-hover:scale-105 transition-all duration-300`}>
                                        <tool.icon size={22} />
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 flex items-center justify-center transition-colors duration-300 shadow-soft">
                                        <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>

                                <div className="flex flex-col flex-1">
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2.5 font-heading">
                                        {tool.title}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold leading-relaxed">
                                        {tool.description}
                                    </p>
                                </div>

                                <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                    <Zap size={14} className="fill-current" /> Initialize Module
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

            </div>
        </div>
    );
}
