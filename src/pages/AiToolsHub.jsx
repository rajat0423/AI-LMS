import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Mic,
    FileText,
    Mail,
    PenTool,
    Sparkles,
    ArrowRight,
    Zap
} from 'lucide-react';

const aiTools = [
    {
        id: 'mock-interview',
        title: 'Mock Interview',
        description: 'Simulate a realistic live interview with our AI hiring manager.',
        path: '/interview',
        icon: Mic,
        color: 'text-violet-600',
        bg: 'bg-violet-100',
        border: 'border-violet-200'
    },
    {
        id: 'resume-analyzer',
        title: 'Resume Optimizer',
        description: 'Scan your resume against any Job Description to beat ATS algorithms.',
        path: '/resume',
        icon: FileText,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        border: 'border-blue-200'
    },
    {
        id: 'email-writer',
        title: 'Email Generator',
        description: 'Draft the perfect follow-up or cold email instantly.',
        path: '/email-writer',
        icon: Mail,
        color: 'text-indigo-600',
        bg: 'bg-indigo-100',
        border: 'border-indigo-200'
    },
    {
        id: 'blog-writer',
        title: 'Blog Writer',
        description: 'Craft high-quality professional articles or blog posts.',
        path: '/blog-writer',
        icon: PenTool,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100',
        border: 'border-emerald-200'
    }
];

export default function AiToolsHub() {
    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-8">
                
                {/* Hub Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-30 -translate-y-1/2 translate-x-1/4"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-extrabold tracking-widest uppercase mb-6 backdrop-blur-md">
                                <Sparkles size={14} className="fill-indigo-400" /> AI Command Center
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-4">
                                Supercharge your Career
                            </h1>
                            <p className="text-slate-300 text-lg font-medium leading-relaxed">
                                Access our fully integrated suite of generative AI tools to practice skills, optimize applications, and land your next role.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {aiTools.map((tool, i) => (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.1 * i, duration: 0.4 }}
                            key={tool.id}
                        >
                            <Link 
                                to={tool.path}
                                className="group flex flex-col h-full bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none p-8 hover:-translate-y-1 hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300"
                            >
                                <div className="flex items-start justify-between mb-8">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm ${tool.bg} dark:bg-opacity-10 ${tool.border} dark:border-opacity-20 ${tool.color} group-hover:scale-110 transition-transform duration-300`}>
                                        <tool.icon size={28} />
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-slate-900 dark:group-hover:bg-slate-700 group-hover:text-white transition-colors duration-300">
                                        <ArrowRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col flex-1">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-3">
                                        {tool.title}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                        {tool.description}
                                    </p>
                                </div>
                                
                                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    <Zap size={16} className="fill-current" /> Initialize Module
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

            </div>
        </div>
    );
}
