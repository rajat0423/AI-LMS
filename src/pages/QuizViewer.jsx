import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Award, RotateCcw, Lightbulb, Target, BrainCircuit, BarChart2, TrendingUp, BookOpen, Layers } from 'lucide-react';
import { apiUrl } from '../api';
import { useAuth } from '../context/useAuth';

function QuizViewer() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode'); // 'lesson' = topic quiz
    const navigate = useNavigate();
    const { token } = useAuth();

    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchQuiz = useCallback(async () => {
        setIsLoading(true);
        try {
            let endpoint;
            if (mode === 'lesson') {
                endpoint = apiUrl(`/api/v1/quiz/lesson/${id}`);
            } else {
                endpoint = apiUrl(`/api/v1/quiz/module/${id}`);
            }
            const res = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (mode === 'lesson') {
                    setQuiz(data); // single quiz object
                } else {
                    if (data && data.length > 0) setQuiz(data[0]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [id, token, mode]);

    useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

    const handleSelectOption = (questionId, optionId) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < quiz.questions.length && !window.confirm("You have unanswered questions. Submit anyway?")) {
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(apiUrl(`/api/v1/quiz/${quiz.quiz_id}/submit`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ answers })
            });
            if (res.ok) {
                const data = await res.json();
                setResult(data);
            } else {
                const errorText = await res.text();
                console.error("Submit error:", errorText);
                alert("Failed to submit assessment. Please try again. Error: " + errorText);
            }
        } catch (e) {
            console.error("Submit exception:", e);
            alert("Network error: failed to submit assessment. Please check your connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="p-12 text-center dark:text-white">Loading assessment...</div>;

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        return (
            <div className="w-full max-w-3xl mx-auto p-12 text-center">
                <h2 className="text-2xl font-bold dark:text-white mb-4">No Assessment Found</h2>
                <p className="text-slate-500 mb-6">There is no quiz configured for this topic yet.</p>
                <button onClick={() => navigate(-1)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg">Go Back</button>
            </div>
        );
    }

    // ── RESULT SCREEN ──────────────────────────────────────────────────────────
    if (result) {
        const feedback = result.feedback || [];
        
        // Detailed Analysis Computations
        const difficultyStats = {};
        const bloomsStats = {};
        const outcomeStats = {};
        const conceptStats = {};
        
        feedback.forEach(fb => {
            // Difficulty
            if (fb.difficulty_level) {
                if (!difficultyStats[fb.difficulty_level]) difficultyStats[fb.difficulty_level] = { total: 0, correct: 0 };
                difficultyStats[fb.difficulty_level].total++;
                if (fb.is_correct) difficultyStats[fb.difficulty_level].correct++;
            }
            
            // Bloom's Level
            if (fb.blooms_level) {
                if (!bloomsStats[fb.blooms_level]) bloomsStats[fb.blooms_level] = { total: 0, correct: 0 };
                bloomsStats[fb.blooms_level].total++;
                if (fb.is_correct) bloomsStats[fb.blooms_level].correct++;
            }
            
            // Course Outcome
            if (fb.course_outcome) {
                if (!outcomeStats[fb.course_outcome]) outcomeStats[fb.course_outcome] = { total: 0, correct: 0 };
                outcomeStats[fb.course_outcome].total++;
                if (fb.is_correct) outcomeStats[fb.course_outcome].correct++;
            }
            
            // Concepts
            if (fb.concepts_tested) {
                fb.concepts_tested.forEach(concept => {
                    if (!conceptStats[concept]) conceptStats[concept] = { total: 0, correct: 0 };
                    conceptStats[concept].total++;
                    if (fb.is_correct) conceptStats[concept].correct++;
                });
            }
        });

        const weakConcepts = [];
        const strongConcepts = [];
        
        Object.entries(conceptStats).forEach(([concept, stats]) => {
            const accuracy = stats.correct / stats.total;
            if (accuracy <= 0.5) {
                weakConcepts.push({ concept, errors: stats.total - stats.correct });
            } else if (accuracy >= 0.8) {
                strongConcepts.push({ concept, correct: stats.correct });
            }
        });

        const sortedWeakConcepts = weakConcepts.sort((a, b) => b.errors - a.errors).map(item => item.concept);
        const sortedStrongConcepts = strongConcepts.sort((a, b) => b.correct - a.correct).map(item => item.concept);

        return (
            <div className="w-full max-w-3xl mx-auto px-4 py-12">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden mb-8">
                    <div className={`absolute top-0 left-0 w-full h-2 ${result.passed ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                    <div className="text-center mb-8">
                        <div className="w-24 h-24 mx-auto bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                            {result.passed ? <Award size={48} className="text-emerald-500" /> : <XCircle size={48} className="text-rose-500" />}
                        </div>
                        <h2 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white mb-2">
                            {result.passed ? 'Assessment Passed!' : 'Assessment Failed'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            You scored {result.score}% &bull; {result.correct_answers} out of {result.total} correct
                        </p>
                    </div>

                    <div className="flex justify-center gap-4">
                        {!result.passed && (
                            <button onClick={() => { setResult(null); setAnswers({}); setCurrentQuestion(0); }}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold hover:bg-slate-200 transition-colors">
                                <RotateCcw size={18} /> Retry Quiz
                            </button>
                        )}
                        {result.passed && mode === 'lesson' && (
                            <button onClick={() => navigate(-1)}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30">
                                Back to Topics <ArrowRight size={18} />
                            </button>
                        )}
                        {result.passed && mode !== 'lesson' && (
                            <button onClick={() => navigate(`/certificate/${id}`)}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30">
                                Claim Certificate <ArrowRight size={18} />
                            </button>
                        )}
                        <button onClick={() => navigate('/dashboard')}
                            className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Dashboard
                        </button>
                    </div>
                </motion.div>

                {/* DETAILED ANALYSIS */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xl font-bold dark:text-white font-heading mb-6 flex items-center gap-2">
                        <BarChart2 className="text-indigo-500" /> Detailed Analysis
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Strong Concepts */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                <TrendingUp size={16} className="text-emerald-500" /> Areas of Strength
                            </h4>
                            {sortedStrongConcepts.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {sortedStrongConcepts.map(concept => (
                                        <span key={concept} className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full text-xs font-bold uppercase tracking-widest">
                                            #{concept}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Keep practicing to build your strengths.</p>
                            )}
                        </div>

                        {/* Weak Concepts */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                <BrainCircuit size={16} className="text-rose-500" /> Concepts to Review
                            </h4>
                            {sortedWeakConcepts.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {sortedWeakConcepts.map(concept => (
                                        <span key={concept} className="px-3 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded-full text-xs font-bold uppercase tracking-widest">
                                            #{concept}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                                    <CheckCircle size={16} /> Perfect! No weak areas detected.
                                </p>
                            )}
                        </div>

                        {/* Difficulty Breakdown */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                <Target size={16} className="text-indigo-500" /> Accuracy by Difficulty
                            </h4>
                            {Object.keys(difficultyStats).length > 0 ? (
                                <div className="space-y-3">
                                    {Object.entries(difficultyStats).map(([diff, stats]) => {
                                        const pct = Math.round((stats.correct / stats.total) * 100);
                                        return (
                                            <div key={diff} className="flex items-center gap-4">
                                                <span className="w-16 text-xs font-bold text-slate-700 dark:text-slate-300">{diff}</span>
                                                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full ${pct > 70 ? 'bg-emerald-500' : pct > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                                <span className="w-8 text-right text-xs font-bold text-slate-500">{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Not available.</p>
                            )}
                        </div>

                        {/* Blooms Taxonomy Breakdown */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 md:col-span-1 lg:col-span-2">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                <Layers size={16} className="text-amber-500" /> Cognitive Profile (Bloom's Level)
                            </h4>
                            {Object.keys(bloomsStats).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(bloomsStats).map(([bloom, stats]) => {
                                        const pct = Math.round((stats.correct / stats.total) * 100);
                                        return (
                                            <div key={bloom} className="flex items-center gap-4">
                                                <span className="w-24 text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={bloom}>{bloom}</span>
                                                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full ${pct > 70 ? 'bg-emerald-500' : pct > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                                <span className="w-8 text-right text-xs font-bold text-slate-500">{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Not available.</p>
                            )}
                        </div>

                        {/* Course Outcomes */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                <BookOpen size={16} className="text-cyan-500" /> Course Outcomes
                            </h4>
                            {Object.keys(outcomeStats).length > 0 ? (
                                <div className="space-y-3">
                                    {Object.entries(outcomeStats).map(([outcome, stats]) => {
                                        const pct = Math.round((stats.correct / stats.total) * 100);
                                        return (
                                            <div key={outcome} className="flex items-center gap-4">
                                                <span className="w-12 text-xs font-bold text-slate-700 dark:text-slate-300">{outcome}</span>
                                                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full ${pct > 70 ? 'bg-emerald-500' : pct > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                                <span className="w-8 text-right text-xs font-bold text-slate-500">{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Not available.</p>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Per-question feedback with explanations */}
                {feedback.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold dark:text-white font-heading">Answer Review</h3>
                        {feedback.map((fb, i) => (
                            <motion.div key={fb.question_id}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className={`rounded-2xl p-5 border-2 ${fb.is_correct ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'}`}>

                                <div className="flex items-start gap-3 mb-2">
                                    {fb.is_correct
                                        ? <CheckCircle size={22} className="text-emerald-500 mt-0.5 shrink-0" />
                                        : <XCircle size={22} className="text-rose-500 mt-0.5 shrink-0" />}
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm leading-snug">
                                        Q{i + 1}: {fb.question_text}
                                    </p>
                                </div>

                                <div className="ml-8 mb-4 flex flex-wrap gap-2">
                                    {fb.difficulty_level && <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold uppercase">{fb.difficulty_level}</span>}
                                    {fb.blooms_level && <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold uppercase">{fb.blooms_level}</span>}
                                    {fb.placement_relevance && <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold uppercase" title={fb.placement_relevance}>Placement Relevant</span>}
                                    {fb.concepts_tested && fb.concepts_tested.map(concept => {
                                        const isStrong = sortedStrongConcepts.includes(concept);
                                        const isWeak = sortedWeakConcepts.includes(concept);
                                        const colorClass = isStrong ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : isWeak ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
                                        return (
                                            <span key={concept} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colorClass}`}>
                                                #{concept} {isStrong ? '(Strong)' : isWeak ? '(Review)' : ''}
                                            </span>
                                        );
                                    })}
                                </div>

                                <div className="ml-8 space-y-1 text-sm">
                                    {!fb.is_correct && fb.user_answer_text && (
                                        <p className="text-rose-600 dark:text-rose-400">
                                            <span className="font-bold">Your answer:</span> {fb.user_answer_text}
                                        </p>
                                    )}
                                    {!fb.is_correct && fb.correct_option_text && (
                                        <p className="text-emerald-700 dark:text-emerald-400 font-bold">
                                            Correct: {fb.correct_option_text}
                                        </p>
                                    )}
                                    {fb.is_correct && (
                                        <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                            {fb.correct_option_text}
                                        </p>
                                    )}
                                    {fb.explanation && (
                                        <div className="flex items-start gap-2 mt-2 bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
                                            <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{fb.explanation}</p>
                                                {fb.recruiter_focus && (
                                                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-2">
                                                        {fb.recruiter_focus}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── QUESTION SCREEN ────────────────────────────────────────────────────────
    const q = quiz.questions[currentQuestion];
    const progress = (currentQuestion / quiz.questions.length) * 100;

    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-12 dark:text-white">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-sm font-bold mb-8">
                <ArrowLeft size={16} /> Exit Assessment
            </button>

            <div className="mb-8">
                <h1 className="text-2xl font-bold font-heading mb-2">{quiz.title}</h1>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
                    <span>{Math.round(progress)}% Complete</span>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={currentQuestion} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-8 leading-snug">{q.text}</h3>

                        <div className="space-y-3">
                            {q.options.map((opt) => (
                                <button key={opt.option_id} onClick={() => handleSelectOption(q.question_id, opt.option_id)}
                                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${answers[q.question_id] === opt.option_id
                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                                        }`}>
                                    <span className={`font-semibold ${answers[q.question_id] === opt.option_id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {opt.text}
                                    </span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[q.question_id] === opt.option_id ? 'border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {answers[q.question_id] === opt.option_id && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                <button onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))} disabled={currentQuestion === 0}
                    className="px-6 py-3 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors">
                    Previous
                </button>

                {currentQuestion < quiz.questions.length - 1 ? (
                    <button onClick={() => setCurrentQuestion(p => p + 1)}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]">
                        Next
                    </button>
                ) : (
                    <button onClick={handleSubmit} disabled={isSubmitting}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]">
                        {isSubmitting ? 'Grading...' : 'Submit Assessment'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default QuizViewer;
