import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Award,
    Users,
    BookOpen,
    Check,
    ShieldCheck,
    ArrowLeft,
    ChevronDown,
    GraduationCap,
    Brain,
    ClipboardList,
    Lightbulb,
    Target,
} from 'lucide-react';
import { apiUrl } from '../api';
import { useAuth } from '../context/useAuth';

function isUnitHeader(title) {
    return title ? title.toLowerCase().startsWith('unit ') : false;
}

function groupLessons(lessons) {
    const unitHeaders = lessons.filter((lesson) => isUnitHeader(lesson.title));
    const topics = lessons.filter((lesson) => !isUnitHeader(lesson.title));

    return unitHeaders.map((unit) => {
        const expectedPrefix = unit.order * 10;
        const unitTopics = topics.filter((topic) => topic.order >= expectedPrefix && topic.order < expectedPrefix + 10);
        return { ...unit, topics: unitTopics };
    });
}

function optionLabel(index) {
    return String.fromCharCode(65 + index);
}

function buildFallbackStudyUnits(units) {
    return units.map((unit) => ({
        lesson_id: unit.lesson_id,
        title: unit.title,
        content: unit.content,
        topic_count: unit.topics.length,
        question_count: unit.topics.length * 15,
        topics: unit.topics.map((topic) => ({
            lesson_id: topic.lesson_id,
            title: topic.title.replace(/^\s*\W+\s*/, '').trim(),
            content: topic.content,
            quiz_id: null,
            question_count: 0,
            questions: [],
        })),
    }));
}

function CourseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [module, setModule] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [mcqBank, setMcqBank] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMcqLoading, setIsMcqLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [mcqErrorMessage, setMcqErrorMessage] = useState('');
    const [openUnit, setOpenUnit] = useState(0);

    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true);
            setIsMcqLoading(true);

            try {
                setErrorMessage('');
                setMcqErrorMessage('');

                const [moduleResult, mcqResult] = await Promise.allSettled([
                    fetch(apiUrl(`/api/v1/modules/${id}`), {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(apiUrl(`/api/v1/quiz/module/${id}/study-bank`), {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                if (moduleResult.status !== 'fulfilled') {
                    throw new Error('Unable to load this module.');
                }

                const moduleResponse = moduleResult.value;
                if (!moduleResponse.ok) {
                    const payload = await moduleResponse.json().catch(() => null);
                    throw new Error(payload?.error?.message || payload?.detail || 'Unable to load this module.');
                }

                const moduleData = await moduleResponse.json();
                setModule(moduleData);
                setLessons(moduleData.lessons || []);

                if (mcqResult.status === 'fulfilled') {
                    const mcqResponse = mcqResult.value;
                    if (mcqResponse.ok) {
                        const mcqData = await mcqResponse.json();
                        setMcqBank(mcqData);
                    } else {
                        const payload = await mcqResponse.json().catch(() => null);
                        setMcqBank(null);
                        setMcqErrorMessage(payload?.error?.message || 'Unit-wise MCQ bank is not configured for this module yet.');
                    }
                } else {
                    setMcqBank(null);
                    setMcqErrorMessage('Unit-wise MCQ bank is not configured for this module yet.');
                }
            } catch (error) {
                console.error(error);
                setModule(null);
                setLessons([]);
                setMcqBank(null);
                setErrorMessage(error.message || 'Unable to load this module.');
            } finally {
                setIsLoading(false);
                setIsMcqLoading(false);
            }
        };

        fetchDetails();
    }, [id, token]);

    if (isLoading) {
        return <div className="p-12 text-center dark:text-white">Loading course...</div>;
    }

    if (!module) {
        return <div className="p-12 text-center dark:text-white">{errorMessage || 'Course not found.'}</div>;
    }

    const syllabusUnits = groupLessons(lessons);
    const renderedUnits = mcqBank?.units?.length ? mcqBank.units : buildFallbackStudyUnits(syllabusUnits);
    const hasUnits = renderedUnits.length > 0;
    const totalTopics = renderedUnits.reduce((sum, unit) => sum + unit.topics.length, 0);
    const totalQuestions = renderedUnits.reduce((sum, unit) => sum + (unit.question_count || 0), 0);

    return (
        <div className="w-full bg-slate-50 dark:bg-slate-900 min-h-screen">
            <div className="bg-slate-900 border-b border-white/10 text-white pb-16 pt-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-bold mb-8">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="col-span-2">
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-500/30 mb-4 inline-block">
                                Year {module.year} - AEC Course
                            </span>
                            <h1 className="text-4xl md:text-5xl font-extrabold font-heading mb-4 leading-tight">{module.title}</h1>
                            <p className="text-lg text-slate-300 leading-relaxed mb-8">{module.description || 'Master the essential skills required to excel in this domain.'}</p>

                            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-400 mb-8">
                                <div className="flex items-center gap-2"><Award className="text-amber-400" size={18} /> 4.8 (1,245 reviews)</div>
                                <div className="flex items-center gap-2"><Users className="text-blue-400" size={18} /> 10,492 enrolled</div>
                                <div className="flex items-center gap-2"><BookOpen className="text-emerald-400" size={18} />
                                    {hasUnits ? `${renderedUnits.length} units · ${totalTopics} topics · ${totalQuestions || totalTopics * 15} MCQs` : `${lessons.length} lessons`}
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute -top-12 left-0 right-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl mb-5 bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <GraduationCap size={28} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Placement MCQ Module</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Unit-wise questions, explanations, difficulty tags, and recruiter-oriented practice.</p>
                                <button onClick={() => navigate('/read-comprehension')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]">
                                    Open My Modules
                                </button>
                                <p className="text-xs text-slate-400 mt-4 font-semibold"><ShieldCheck size={14} className="inline mr-1" />Access follows your registered academic year</p>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-slate-900 dark:text-white">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="col-span-2 space-y-12">
                        <section className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
                            <h2 className="text-2xl font-bold mb-6 font-heading">What you'll learn</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    'Build confidence and professional mindset',
                                    'Master verbal and non-verbal communication',
                                    'Write polished professional emails',
                                    'Deliver confident public speeches',
                                    'Apply SMART goal setting techniques',
                                    'Collaborate effectively in teams',
                                ].map((item, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <div className="mt-0.5"><Check size={18} className="text-emerald-500" /></div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold font-heading">Module MCQ Bank</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        Study unit-wise MCQs with correct answers, explanations, placement relevance, and recruiter-focused cues.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-widest">
                                    <span className="px-3 py-2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">Year Locked</span>
                                    <span className="px-3 py-2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">4 Options Each</span>
                                    <span className="px-3 py-2 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Recruiter Oriented</span>
                                </div>
                            </div>

                            {!hasUnits && (
                                <p className="text-slate-400 text-sm">Syllabus content is being generated for this course.</p>
                            )}

                            {hasUnits && (
                                <div className="space-y-4">
                                    {renderedUnits.map((unit, unitIndex) => (
                                        <div key={unit.lesson_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <button
                                                onClick={() => setOpenUnit(openUnit === unitIndex ? -1 : unitIndex)}
                                                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <Brain size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{unit.title}</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{unit.topic_count || unit.topics.length} topics · {unit.question_count || unit.topics.length * 15} MCQs</p>
                                                    </div>
                                                </div>
                                                <motion.div animate={{ rotate: openUnit === unitIndex ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                                    <ChevronDown size={20} className="text-slate-400" />
                                                </motion.div>
                                            </button>

                                            <AnimatePresence initial={false}>
                                                {openUnit === unitIndex && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-5 bg-slate-50/60 dark:bg-slate-900/20">
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">{unit.content}</p>

                                                            <div className="space-y-5">
                                                                {unit.topics.map((topic, topicIndex) => (
                                                                    <div key={topic.lesson_id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-5">
                                                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                                                                            <div>
                                                                                <div className="flex items-center gap-3 mb-2">
                                                                                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-300">
                                                                                        {topicIndex + 1}
                                                                                    </div>
                                                                                    <h5 className="font-bold text-slate-900 dark:text-white">{topic.title}</h5>
                                                                                </div>
                                                                                <p className="text-sm text-slate-500 dark:text-slate-400">{topic.content}</p>
                                                                            </div>

                                                                            <button
                                                                                onClick={() => navigate(`/quiz/${topic.lesson_id}?mode=lesson`)}
                                                                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-indigo-600/20 active:scale-[0.97] whitespace-nowrap"
                                                                            >
                                                                                <ClipboardList size={13} /> Take Quiz
                                                                            </button>
                                                                        </div>

                                                                        {topic.questions?.length > 0 ? (
                                                                            <div className="space-y-4">
                                                                                {topic.questions.map((question, questionIndex) => (
                                                                                    <div key={question.question_id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
                                                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                                                            <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-widest">
                                                                                                {question.difficulty_level}
                                                                                            </span>
                                                                                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-widest">
                                                                                                Placement Relevance
                                                                                            </span>
                                                                                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[11px] font-bold uppercase tracking-widest">
                                                                                                Recruiter Lens
                                                                                            </span>
                                                                                        </div>

                                                                                        <h6 className="text-base font-bold text-slate-900 dark:text-white leading-relaxed mb-4">
                                                                                            Q{questionIndex + 1}. {question.text}
                                                                                        </h6>

                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                                                            {question.options.map((option, optionIndex) => {
                                                                                                const isCorrect = option.option_id === question.correct_option_id;
                                                                                                return (
                                                                                                    <div
                                                                                                        key={option.option_id}
                                                                                                        className={`rounded-xl border px-4 py-3 text-sm ${isCorrect
                                                                                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100'
                                                                                                            : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                                                            }`}
                                                                                                    >
                                                                                                        <span className="font-bold mr-2">{optionLabel(optionIndex)}.</span>
                                                                                                        {option.text}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>

                                                                                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                                                                                            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                                                                                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Correct Answer</p>
                                                                                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{question.correct_option_text || 'Not configured yet'}</p>
                                                                                            </div>

                                                                                            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                                                                                                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                                                                                    <Target size={12} /> Placement Relevance
                                                                                                </div>
                                                                                                <p className="text-sm text-slate-700 dark:text-slate-300">{question.placement_relevance}</p>
                                                                                            </div>

                                                                                            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                                                                                                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                                                                                    <Lightbulb size={12} /> Recruiter Focus
                                                                                                </div>
                                                                                                <p className="text-sm text-slate-700 dark:text-slate-300">{question.recruiter_focus}</p>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="mt-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4">
                                                                                            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500 mb-1">Detailed Explanation</p>
                                                                                            <p className="text-sm text-slate-700 dark:text-slate-200">{question.explanation || 'Explanation will appear here once configured.'}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                                                {isMcqLoading
                                                                                    ? 'Loading unit-wise MCQ bank...'
                                                                                    : mcqErrorMessage || 'MCQs will appear here once this topic is configured.'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CourseDetail;
