import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, CheckCircle2, FileText,
    Mail, PenTool, Target, Sparkles, ArrowRight, Loader2, ClipboardList
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useGlobalUser } from '../context/useGlobalUser';
import { apiUrl } from '../api';
import MCQWorkspace from '../components/mcq/MCQWorkspace';
import BackButton from '../components/BackButton';

const staticCurriculum = {
    1: {
        stage: 'Foundation',
        title: 'Mastering Reading Comprehension',
        description: 'Build core reading confidence with short passages, context clues, and structured answer practice before moving into advanced communication modules.',
        practicePoints: [
            'Identify the main idea of the passage.',
            'Infer the author tone from the highlighted paragraph.',
            'Choose the strongest supporting detail for the conclusion.',
        ],
        next: 'Introduction to Vocabulary Strategies',
        aiTools: [
            { label: 'Mock Interview', sub: 'Practice with AI interviewer', path: '/interview', icon: Target, col: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
            { label: 'Email Drafting', sub: 'Practice professional writing', path: '/email-writer', icon: Mail, col: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
        ],
    },
    2: {
        stage: 'Communication',
        title: 'Professional Communication Skills',
        description: 'Advance your written and verbal communication through email drafting, professional vocabulary, and structured response frameworks used in the workplace.',
        practicePoints: [
            'Draft a professional email responding to a client inquiry.',
            'Identify formal vs informal tone in the given samples.',
            'Structure a response using the STAR method.',
        ],
        next: 'Advanced Vocabulary & Idioms',
        aiTools: [
            { label: 'Email Drafting', sub: 'AI-assisted professional emails', path: '/email-writer', icon: Mail, col: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
            { label: 'Blog Writer', sub: 'Practice long-form writing', path: '/blog-writer', icon: PenTool, col: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
        ],
    },
    3: {
        stage: 'Career Prep',
        title: 'Interview & Resume Mastery',
        description: 'Prepare for real-world interviews with mock sessions, resume building techniques, and situational question practice tailored to your target industry.',
        practicePoints: [
            'Answer a behavioral question using the STAR framework.',
            'Identify gaps in the sample resume and suggest improvements.',
            'Practice a 60-second elevator pitch for your dream role.',
        ],
        next: 'Employability & Industry Readiness',
        aiTools: [
            { label: 'Mock Interview', sub: 'Practice with AI interviewer', path: '/interview', icon: Target, col: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
            { label: 'Resume Analyzer', sub: 'AI-powered resume review', path: '/resume', icon: FileText, col: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
        ],
    },
    4: {
        stage: 'Industry Ready',
        title: 'Advanced Employability Skills',
        description: 'Final stage preparation combining all skills with advanced communication, technical interview readiness, and professional portfolio presentation.',
        practicePoints: [
            'Deliver a structured answer to a complex technical scenario.',
            'Present a case study analysis with clear recommendations.',
            'Compose a cover letter for a specific job listing.',
        ],
        next: 'All modules completed — You are placement ready!',
        aiTools: [
            { label: 'AI Interviewer', sub: 'Advanced mock sessions', path: '/interview', icon: Target, col: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
        ],
    },
};

function getYearNumber(user) {
    if (typeof user?.yearNumber === 'number') {
        return user.yearNumber;
    }

    const matchedYear = String(user?.year || '').match(/[1-4]/);
    return matchedYear ? Number(matchedYear[0]) : 3;
}

function isUnitHeader(title) {
    return title ? title.toLowerCase().startsWith('unit ') : false;
}

export default function ReadComprehension() {
    const { token, user } = useAuth();
    const { refreshUserData } = useGlobalUser();
    const navigate = useNavigate();
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedModuleMcqBank, setSelectedModuleMcqBank] = useState(null);
    const [isLoadingModules, setIsLoadingModules] = useState(true);
    const [isLoadingSelectedModule, setIsLoadingSelectedModule] = useState(false);
    const [isLoadingSelectedModuleMcqBank, setIsLoadingSelectedModuleMcqBank] = useState(false);
    const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
    const [completingLessonId, setCompletingLessonId] = useState(null);
    const [completedLessons, setCompletedLessons] = useState(new Set());
    const [activeTab, setActiveTab] = useState('workspace');

    const currentYearNumber = getYearNumber(user);
    const currentYearLabel = `Year ${currentYearNumber}`;

    useEffect(() => {
        async function fetchModules() {
            try {
                const res = await fetch(apiUrl('/api/v1/modules'), {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (res.ok) {
                    const data = await res.json();
                    setModules(Array.isArray(data) ? data : data.modules || []);
                }
            } catch (e) {
                console.error('Failed to fetch modules:', e);
            } finally {
                setIsLoadingModules(false);
            }
        }

        fetchModules();
    }, [token]);

    useEffect(() => {
        async function fetchProgress() {
            if (!token) return;

            try {
                const res = await fetch(apiUrl('/api/v1/my/progress'), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    const completed = new Set(
                        (data.items || [])
                            .filter((item) => item.is_completed)
                            .map((item) => item.lesson_id)
                    );
                    setCompletedLessons(completed);
                }
            } catch (e) {
                console.error('Failed to fetch progress:', e);
            }
        }

        fetchProgress();
    }, [token]);

    useEffect(() => {
        if (selectedModuleIdx >= modules.length && modules.length > 0) {
            setSelectedModuleIdx(0);
        }
    }, [modules, selectedModuleIdx]);

    useEffect(() => {
        async function fetchSelectedModule() {
            const currentModuleSummary = modules[selectedModuleIdx];
            if (!currentModuleSummary?.module_id || !token) {
                setSelectedModule(null);
                setIsLoadingSelectedModule(false);
                return;
            }

            setIsLoadingSelectedModule(true);
            try {
                const res = await fetch(apiUrl(`/api/v1/modules/${currentModuleSummary.module_id}`), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setSelectedModule(data);
                } else {
                    setSelectedModule(currentModuleSummary);
                }
            } catch (e) {
                console.error('Failed to fetch selected module details:', e);
                setSelectedModule(currentModuleSummary);
            } finally {
                setIsLoadingSelectedModule(false);
            }
        }

        fetchSelectedModule();
    }, [modules, selectedModuleIdx, token]);

    useEffect(() => {
        async function fetchSelectedModuleMcqBank() {
            const currentModuleSummary = modules[selectedModuleIdx];
            if (!currentModuleSummary?.module_id || !token) {
                setSelectedModuleMcqBank(null);
                setIsLoadingSelectedModuleMcqBank(false);
                return;
            }

            setIsLoadingSelectedModuleMcqBank(true);
            try {
                const res = await fetch(apiUrl(`/api/v1/quiz/module/${currentModuleSummary.module_id}/study-bank`), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setSelectedModuleMcqBank(data);
                } else {
                    setSelectedModuleMcqBank(null);
                }
            } catch (e) {
                console.error('Failed to fetch module MCQ bank:', e);
                setSelectedModuleMcqBank(null);
            } finally {
                setIsLoadingSelectedModuleMcqBank(false);
            }
        }

        fetchSelectedModuleMcqBank();
    }, [modules, selectedModuleIdx, token]);

    const handleMarkComplete = async (lessonId) => {
        if (!token || !lessonId) return;

        setCompletingLessonId(lessonId);
        try {
            const res = await fetch(apiUrl(`/api/v1/lessons/${lessonId}/complete`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                setCompletedLessons((prev) => new Set([...prev, lessonId]));
                try {
                    refreshUserData();
                } catch (e) {
                    console.error("Failed to refresh user stats on lesson completion:", e);
                }
            }
        } catch (e) {
            console.error('Failed to mark lesson complete:', e);
        } finally {
            setCompletingLessonId(null);
        }
    };

    const handleLaunchQuiz = (lessonId) => {
        navigate(`/quiz/${lessonId}?mode=lesson`);
    };

    const useLiveModules = modules.length > 0;
    const fallbackData = staticCurriculum[currentYearNumber] || staticCurriculum[3];
    const currentModule = useLiveModules ? (selectedModule || modules[selectedModuleIdx]) : null;

    const data = useLiveModules && currentModule
        ? {
            stage: fallbackData.stage,
            title: currentModule.title || 'Learning Module',
            description: currentModule.description || 'Explore this learning module and complete the lessons assigned to your year.',
            lessons: currentModule.lessons || [],
            practicePoints: fallbackData.practicePoints,
            next: selectedModuleIdx < modules.length - 1
                ? modules[selectedModuleIdx + 1]?.title || 'Next Module'
                : 'All modules completed!',
            aiTools: fallbackData.aiTools,
        }
        : {
            ...fallbackData,
            lessons: [],
        };

    if (isLoadingModules) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                    <p className="text-slate-500 font-medium">Loading your curriculum...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
            <BackButton />
            <div className="bg-white dark:bg-slate-900 rounded-3xl px-8 py-6 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Learning Modules</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {useLiveModules
                                ? `${modules.length} module${modules.length !== 1 ? 's' : ''} available for ${currentYearLabel}.`
                                : `Showing the ${currentYearLabel} curriculum linked to your account.`}
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-5 py-3 text-sm font-bold text-indigo-700 dark:text-indigo-400">
                        <BookOpen size={16} />
                        {currentYearLabel}
                    </div>
                </div>
            </div>

            {useLiveModules && modules.length > 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Modules In Your Year</p>
                    <div className="flex flex-wrap gap-3">
                        {modules.map((module, index) => (
                            <button
                                key={module.module_id}
                                onClick={() => setSelectedModuleIdx(index)}
                                className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
                                    selectedModuleIdx === index
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                {module.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8">
                <div className="flex flex-col gap-6 min-w-0">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px mb-2">
                        {[
                            { id: 'workspace', label: 'Study Workspace' },
                            { id: 'overview', label: 'Overview & AI Tools' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div
                                key={`${selectedModuleIdx}-overview-tab`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8 md:p-10">
                                    <div className="flex flex-wrap items-center gap-3 mb-5">
                                        <span className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                                            {currentYearLabel} • {data.stage}
                                        </span>
                                        {useLiveModules && (
                                            <span className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
                                                Module {selectedModuleIdx + 1} of {modules.length}
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug mb-4">
                                        {data.title}
                                    </h2>
                                    <p className="text-base text-slate-500 dark:text-slate-200 font-bold leading-relaxed">
                                        {data.description}
                                    </p>
                                </section>

                                <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                <Sparkles size={16} className="text-indigo-500 dark:text-indigo-400" /> Recommended AI Tools
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Suggested for your current year and module stage.</p>
                                        </div>
                                        <Link to="/ai-tools" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
                                            All Tools →
                                        </Link>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {data.aiTools.map((tool) => (
                                            <Link
                                                key={tool.label}
                                                to={tool.path}
                                                className={`group flex items-center gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-800 hover:-translate-y-0.5 hover:shadow-md transition-all ${tool.bg} dark:border-slate-700`}
                                            >
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${tool.bg} ${tool.col} group-hover:scale-110 transition-transform`}>
                                                    <tool.icon size={22} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{tool.label}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">{tool.sub}</p>
                                                </div>
                                                <ArrowRight size={16} className="text-slate-350 dark:text-slate-550 mt-1.5 flex-shrink-0" />
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            </motion.div>
                        )}



                        {activeTab === 'workspace' && (
                            <motion.section
                                key={`${selectedModuleIdx}-workspace-tab`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.3 }}
                            >
                                {isLoadingSelectedModuleMcqBank && useLiveModules ? (
                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-sm font-medium text-slate-550 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                                        <Loader2 size={18} className="animate-spin text-indigo-500" />
                                        Loading MCQ workspace...
                                    </div>
                                ) : (
                                    <MCQWorkspace
                                        moduleTitle={data.title}
                                        currentYearLabel={currentYearLabel}
                                        studyBank={selectedModuleMcqBank}
                                        token={token}
                                        completedLessons={completedLessons}
                                        completingLessonId={completingLessonId}
                                        onLaunchQuiz={handleLaunchQuiz}
                                        onMarkTopicComplete={handleMarkComplete}
                                    />
                                )}
                            </motion.section>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col gap-6 sticky top-10 self-start">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                        <h3 className="font-black text-slate-800 dark:text-slate-200 mb-6 text-xs uppercase tracking-widest flex items-center gap-2">
                            <FileText size={16} className="text-indigo-500 dark:text-indigo-400" /> Curriculum Snapshot
                        </h3>
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3">
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Assigned Year</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{currentYearLabel}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3">
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Current Stage</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{data.stage}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3">
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Available Lessons</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                                    {data.lessons.length > 0 ? `${data.lessons.length} lesson${data.lessons.length !== 1 ? 's' : ''}` : `${data.practicePoints.length} practice goals`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${selectedModuleIdx}-next`}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
                        >
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/40 rounded-full blur-3xl pointer-events-none" />
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-3">Up Next</p>
                            <p className="text-white text-base font-bold mb-8 leading-snug">{data.next}</p>
                            {useLiveModules && selectedModuleIdx < modules.length - 1 && (
                                <button
                                    onClick={() => setSelectedModuleIdx((prev) => prev + 1)}
                                    className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg active:scale-95 text-sm"
                                >
                                    Go to Next Module
                                </button>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
