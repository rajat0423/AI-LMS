import { useEffect, useMemo, useState } from 'react';
import { FolderKanban, Search, SlidersHorizontal, Sparkles, X, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import UnitAccordion from './UnitAccordion';
import AnalyticsSidebar from './AnalyticsSidebar';
import { apiUrl } from '../../api';

const DEFAULT_FILTERS = {
    difficulty: 'all',
    bloom: 'all',
    outcome: 'all',
    status: 'all',
};

function getQuestionFilterValue(value) {
    return value || 'Unspecified';
}

function shouldShowQuestionInMode(question, mode, submissions, bookmarks) {
    if (mode !== 'revision') {
        return true;
    }

    const submission = submissions[question.question_id];
    return Boolean(bookmarks[question.question_id] || submission);
}

function matchesQuestionFilters(question, filters, submissions, bookmarks) {
    const submission = submissions[question.question_id];
    const isBookmarked = Boolean(bookmarks[question.question_id]);

    if (filters.difficulty !== 'all' && getQuestionFilterValue(question.difficulty_level) !== filters.difficulty) {
        return false;
    }
    if (filters.bloom !== 'all' && getQuestionFilterValue(question.blooms_level) !== filters.bloom) {
        return false;
    }
    if (filters.outcome !== 'all' && getQuestionFilterValue(question.course_outcome) !== filters.outcome) {
        return false;
    }

    if (filters.status === 'attempted') {
        return Boolean(submission);
    }
    if (filters.status === 'unattempted') {
        return !submission;
    }
    if (filters.status === 'bookmarked') {
        return isBookmarked;
    }
    if (filters.status === 'correct') {
        return Boolean(submission?.isCorrect);
    }
    if (filters.status === 'incorrect') {
        return Boolean(submission && !submission.isCorrect);
    }

    return true;
}

function calculateTopicProgress(topic, submissions) {
    const totalQuestions = topic.question_count || topic.questions?.length || 0;
    const topicSubmissions = (topic.questions || [])
        .map((question) => submissions[question.question_id])
        .filter(Boolean);
    const attempted = topicSubmissions.length;
    const correct = topicSubmissions.filter((submission) => submission.isCorrect).length;

    return {
        totalQuestions,
        attempted,
        correct,
        completion: totalQuestions > 0 ? Math.round((attempted / totalQuestions) * 100) : 0,
        accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    };
}

function normalizeBackendAnalytics(payload, fallbackAnalytics) {
    if (!payload) {
        return fallbackAnalytics;
    }

    const topicBreakdown = payload.topic_breakdown || [];
    const weakAreas = (payload.weak_areas || []).map((topic) => ({
        lessonId: topic.lesson_id,
        title: topic.title,
        attempted: topic.attempted,
        totalQuestions: topic.total_questions,
        accuracy: topic.accuracy_percentage,
    }));

    return {
        ...fallbackAnalytics,
        source: 'backend',
        totalUnits: payload.total_units ?? fallbackAnalytics.totalUnits,
        totalTopics: payload.total_topics ?? fallbackAnalytics.totalTopics,
        totalQuestions: payload.total_questions ?? fallbackAnalytics.totalQuestions,
        attemptedCount: payload.attempted_count ?? fallbackAnalytics.attemptedCount,
        correctCount: payload.correct_count ?? fallbackAnalytics.correctCount,
        bookmarkedCount: payload.bookmarked_count ?? fallbackAnalytics.bookmarkedCount,
        accuracyPercentage: payload.accuracy_percentage ?? fallbackAnalytics.accuracyPercentage,
        questionCompletionPercentage: payload.question_completion_percentage ?? fallbackAnalytics.questionCompletionPercentage,
        topicCompletionPercentage: fallbackAnalytics.topicCompletionPercentage,
        completedTopics: fallbackAnalytics.completedTopics,
        topicBreakdown,
        difficultyBreakdown: payload.difficulty_breakdown || {},
        bloomBreakdown: payload.bloom_breakdown || {},
        outcomeBreakdown: payload.outcome_breakdown || {},
        weakAreas,
    };
}

function MCQWorkspace({
    moduleTitle,
    currentYearLabel,
    studyBank,
    token,
    completedLessons,
    completingLessonId,
    onLaunchQuiz,
    onMarkTopicComplete,
}) {
    const units = useMemo(() => studyBank?.units || [], [studyBank?.units]);
    const [searchParams, setSearchParams] = useSearchParams();

    const [mode, setMode] = useState('learning');
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState(() => ({
        difficulty: searchParams.get('mcqDifficulty') || DEFAULT_FILTERS.difficulty,
        bloom: searchParams.get('mcqBloom') || DEFAULT_FILTERS.bloom,
        outcome: searchParams.get('mcqOutcome') || DEFAULT_FILTERS.outcome,
        status: searchParams.get('mcqStatus') || DEFAULT_FILTERS.status,
    }));
    const [openUnitId, setOpenUnitId] = useState('');
    const [activeTopicId, setActiveTopicId] = useState('');
    const [topicQuestionIndexes, setTopicQuestionIndexes] = useState({});
    const [answers, setAnswers] = useState({});
    const [submissions, setSubmissions] = useState({});
    const [bookmarks, setBookmarks] = useState({});
    const [explanationVisibility, setExplanationVisibility] = useState({});
    const [pendingQuestionId, setPendingQuestionId] = useState('');
    const [backendAnalytics, setBackendAnalytics] = useState(null);
    const [analyticsStatus, setAnalyticsStatus] = useState('idle');
    const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);

    useEffect(() => {
        const firstUnit = units[0];
        const firstTopic = firstUnit?.topics?.[0];
        setSearchQuery('');
        setMode('learning');
        setOpenUnitId(firstUnit?.lesson_id || '');
        setActiveTopicId(firstTopic?.lesson_id || '');
        setTopicQuestionIndexes({});
        const initialAnswers = {};
        const initialSubmissions = {};
        const initialBookmarks = {};
        for (const unit of units) {
            for (const topic of unit.topics || []) {
                for (const question of topic.questions || []) {
                    if (question.attempt_state?.selected_option_id) {
                        initialAnswers[question.question_id] = question.attempt_state.selected_option_id;
                        initialSubmissions[question.question_id] = {
                            selectedOptionId: question.attempt_state.selected_option_id,
                            selectedOptionText: question.attempt_state.selected_option_text,
                            correctOptionId: question.attempt_state.correct_option_id,
                            correctOptionText: question.attempt_state.correct_option_text,
                            isCorrect: question.attempt_state.is_correct,
                        };
                    }
                    if (question.is_bookmarked) {
                        initialBookmarks[question.question_id] = true;
                    }
                }
            }
        }
        setAnswers(initialAnswers);
        setSubmissions(initialSubmissions);
        setBookmarks(initialBookmarks);
        setExplanationVisibility({});
        setPendingQuestionId('');
        setBackendAnalytics(null);
        setAnalyticsStatus('idle');
        setAnalyticsRefreshKey(0);
    }, [studyBank?.module_id, units]);

    useEffect(() => {
        if (!studyBank?.module_id || !token) {
            return;
        }

        let isActive = true;

        const fetchAnalytics = async () => {
            setAnalyticsStatus('loading');
            try {
                const res = await fetch(apiUrl(`/api/v1/quiz/module/${studyBank.module_id}/analytics`), {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    throw new Error('Analytics request failed');
                }

                const payload = await res.json();
                if (isActive) {
                    setBackendAnalytics(payload);
                    setAnalyticsStatus('ready');
                }
            } catch (error) {
                console.error('Failed to load module analytics:', error);
                if (isActive) {
                    setAnalyticsStatus('error');
                }
            }
        };

        fetchAnalytics();

        return () => {
            isActive = false;
        };
    }, [analyticsRefreshKey, studyBank?.module_id, token]);

    useEffect(() => {
        setFilters({
            difficulty: searchParams.get('mcqDifficulty') || DEFAULT_FILTERS.difficulty,
            bloom: searchParams.get('mcqBloom') || DEFAULT_FILTERS.bloom,
            outcome: searchParams.get('mcqOutcome') || DEFAULT_FILTERS.outcome,
            status: searchParams.get('mcqStatus') || DEFAULT_FILTERS.status,
        });
    }, [searchParams]);

    const topicById = useMemo(() => {
        const topics = new Map();
        for (const unit of units) {
            for (const topic of unit.topics || []) {
                topics.set(topic.lesson_id, topic);
            }
        }
        return topics;
    }, [units]);

    const filterOptions = useMemo(() => {
        const difficulties = new Set();
        const blooms = new Set();
        const outcomes = new Set();

        for (const unit of units) {
            for (const topic of unit.topics || []) {
                for (const question of topic.questions || []) {
                    difficulties.add(getQuestionFilterValue(question.difficulty_level));
                    blooms.add(getQuestionFilterValue(question.blooms_level));
                    outcomes.add(getQuestionFilterValue(question.course_outcome));
                }
            }
        }

        return {
            difficulties: [...difficulties].sort(),
            blooms: [...blooms].sort(),
            outcomes: [...outcomes].sort(),
        };
    }, [units]);

    const filteredUnits = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return units
            .map((unit) => {
                const matchingTopics = (unit.topics || [])
                    .map((topic) => {
                        const topicText = `${topic.title} ${topic.content}`.toLowerCase();
                        const matchingQuestions = (topic.questions || []).filter((question) => {
                            const concepts = (question.concepts_tested || []).join(' ');
                            const questionText = `${question.text} ${concepts}`.toLowerCase();
                            const matchesSearch = !normalizedQuery || topicText.includes(normalizedQuery) || questionText.includes(normalizedQuery);
                            return matchesSearch
                                && shouldShowQuestionInMode(question, mode, submissions, bookmarks)
                                && matchesQuestionFilters(question, filters, submissions, bookmarks);
                        });

                        return matchingQuestions.length > 0
                            ? {
                                ...topic,
                                question_count: matchingQuestions.length,
                                original_question_count: topic.question_count || topic.questions?.length || matchingQuestions.length,
                                questions: matchingQuestions,
                            }
                            : null;
                    })
                    .filter(Boolean);

                return matchingTopics.length > 0 ? { ...unit, topics: matchingTopics } : null;
            })
            .filter(Boolean);
    }, [bookmarks, filters, mode, searchQuery, submissions, units]);

    const getTopicProgress = (topic) => calculateTopicProgress(topicById.get(topic.lesson_id) || topic, submissions);

    const localAnalytics = useMemo(() => {
        const topics = units.flatMap((unit) => unit.topics || []);
        const totalQuestions = topics.reduce((sum, topic) => sum + (topic.question_count || 0), 0);
        const attemptedCount = Object.keys(submissions).length;
        const correctCount = Object.values(submissions).filter((submission) => submission.isCorrect).length;
        const totalTopics = topics.length;
        const completedTopics = topics.filter((topic) => completedLessons.has(topic.lesson_id)).length;
        const bookmarkedCount = Object.values(bookmarks).filter(Boolean).length;
        const accuracyPercentage = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
        const questionCompletionPercentage = totalQuestions > 0 ? Math.round((attemptedCount / totalQuestions) * 100) : 0;
        const topicCompletionPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
        const weakAreas = topics
            .map((topic) => {
                const progress = calculateTopicProgress(topic, submissions);
                return {
                    lessonId: topic.lesson_id,
                    title: topic.title,
                    attempted: progress.attempted,
                    totalQuestions: progress.totalQuestions,
                    accuracy: progress.accuracy,
                };
            })
            .filter((topic) => topic.attempted > 0)
            .sort((left, right) => left.accuracy - right.accuracy)
            .slice(0, 3);

        return {
            totalUnits: units.length,
            totalTopics,
            totalQuestions,
            attemptedCount,
            correctCount,
            bookmarkedCount,
            completedTopics,
            accuracyPercentage,
            questionCompletionPercentage,
            topicCompletionPercentage,
            weakAreas,
        };
    }, [bookmarks, completedLessons, submissions, units]);

    const analytics = useMemo(
        () => normalizeBackendAnalytics(backendAnalytics, localAnalytics),
        [backendAnalytics, localAnalytics],
    );

    const handleSelectOption = (questionId, optionId) => {
        setAnswers((current) => ({ ...current, [questionId]: optionId }));
    };

    const handleSubmitAnswer = async (topic, question) => {
        const selectedOptionId = answers[question.question_id];
        if (!selectedOptionId || !token) {
            return;
        }

        setPendingQuestionId(question.question_id);
        try {
            const res = await fetch(apiUrl(`/api/v1/quiz/question/${question.question_id}/attempt`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    selected_option_id: selectedOptionId,
                    mode,
                }),
            });

            if (!res.ok) {
                return;
            }

            const payload = await res.json();
            
            const nextSubmissions = {
                ...submissions,
                [question.question_id]: {
                    selectedOptionId: payload.selected_option_id,
                    selectedOptionText: payload.selected_option_text,
                    correctOptionId: payload.correct_option_id,
                    correctOptionText: payload.correct_option_text,
                    isCorrect: payload.is_correct,
                },
            };

            setSubmissions(nextSubmissions);

            if (mode === 'learning') {
                setExplanationVisibility((current) => ({ ...current, [question.question_id]: true }));
            }
            setAnalyticsRefreshKey((current) => current + 1);

            // Automate topic completion if all questions are now attempted
            const visibleQuestions = topic?.questions || [];
            if (visibleQuestions.length > 0) {
                const allAttempted = visibleQuestions.every((q) => nextSubmissions[q.question_id]);
                const isCompleted = completedLessons?.has(topic.lesson_id);
                if (allAttempted && !isCompleted && onMarkTopicComplete) {
                    onMarkTopicComplete(topic.lesson_id);
                }
            }
        } catch (error) {
            console.error('Failed to persist question attempt:', error);
        } finally {
            setPendingQuestionId('');
        }
    };

    const handleToggleExplanation = (questionId) => {
        setExplanationVisibility((current) => ({ ...current, [questionId]: !current[questionId] }));
    };

    const handleToggleBookmark = async (questionId) => {
        if (!token) {
            return;
        }

        const nextState = !bookmarks[questionId];
        setBookmarks((current) => ({ ...current, [questionId]: nextState }));
        try {
            const res = await fetch(apiUrl(`/api/v1/quiz/question/${questionId}/bookmark`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ is_bookmarked: nextState }),
            });

            if (!res.ok) {
                setBookmarks((current) => ({ ...current, [questionId]: !nextState }));
                return;
            }
            setAnalyticsRefreshKey((current) => current + 1);
        } catch (error) {
            console.error('Failed to persist bookmark:', error);
            setBookmarks((current) => ({ ...current, [questionId]: !nextState }));
        }
    };

    const handleQuestionIndexChange = (topicId, nextIndex) => {
        setTopicQuestionIndexes((current) => ({ ...current, [topicId]: nextIndex }));
    };

    const handleFilterChange = (name, value) => {
        setFilters((current) => ({ ...current, [name]: value }));

        const queryKeys = {
            difficulty: 'mcqDifficulty',
            bloom: 'mcqBloom',
            outcome: 'mcqOutcome',
            status: 'mcqStatus',
        };
        const nextParams = new URLSearchParams(searchParams);
        if (value === DEFAULT_FILTERS[name]) {
            nextParams.delete(queryKeys[name]);
        } else {
            nextParams.set(queryKeys[name], value);
        }
        setSearchParams(nextParams, { replace: true });
        setTopicQuestionIndexes({});
    };

    const resetFilters = () => {
        setFilters(DEFAULT_FILTERS);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('mcqDifficulty');
        nextParams.delete('mcqBloom');
        nextParams.delete('mcqOutcome');
        nextParams.delete('mcqStatus');
        setSearchParams(nextParams, { replace: true });
        setTopicQuestionIndexes({});
    };

    const toggleUnit = (unitId) => {
        setOpenUnitId((current) => (current === unitId ? '' : unitId));
    };

    const toggleTopic = (topicId) => {
        setActiveTopicId((current) => (current === topicId ? '' : topicId));
    };

    const hasActiveFilters = Object.entries(filters).some(([name, value]) => value !== DEFAULT_FILTERS[name]);

    if (!units.length) {
        return (
            <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                    <FolderKanban size={20} className="text-indigo-500" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">MCQ Workspace</h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Structured questions will appear here once this module's study bank is configured.
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <div className="rounded-[2.5rem] relative overflow-hidden bg-slate-900 text-white shadow-2xl">
                {/* Decorative background effects */}
                <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-[80px]" />
                <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-[80px]" />

                <div className="relative p-8 md:p-10 border-b border-white/10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-indigo-200 backdrop-blur-md">
                                <Sparkles size={14} className="text-indigo-400" /> Study Workspace
                            </div>
                            <h3 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-4xl">{moduleTitle}</h3>
                            <p className="mt-3 text-base font-medium text-slate-300 leading-relaxed">
                                Master concepts unit by unit. Practice with curated questions, track your module accuracy, and earn lesson completions.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row lg:flex-col xl:flex-row">
                            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3.5 backdrop-blur-md border border-white/10 focus-within:border-white/30 focus-within:bg-white/15 transition-all">
                                <Search size={18} className="text-indigo-300" />
                                <input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search concepts or questions..."
                                    className="w-full min-w-[200px] bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-400"
                                />
                            </div>

                            <div className="flex items-center gap-1 rounded-2xl bg-white/10 p-1.5 backdrop-blur-md border border-white/10 shrink-0">
                                {['learning', 'exam', 'revision'].map((modeOption) => (
                                    <button
                                        key={modeOption}
                                        onClick={() => setMode(modeOption)}
                                        className={`rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                                            mode === modeOption
                                                ? 'bg-indigo-500 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {modeOption}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative p-6 md:p-8 bg-white/5 border-t border-white/5">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 mr-2">
                            <SlidersHorizontal size={14} />
                            Filters:
                        </div>
                        
                        <div className="relative group">
                            <select
                                value={filters.difficulty}
                                onChange={(event) => handleFilterChange('difficulty', event.target.value)}
                                className="appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-9 text-xs font-bold text-slate-200 outline-none transition-colors hover:bg-white/10 focus:border-indigo-400 cursor-pointer"
                            >
                                <option value="all" className="bg-slate-900">Difficulty: All</option>
                                {filterOptions.difficulties.map((difficulty) => (
                                    <option key={difficulty} value={difficulty} className="bg-slate-900">{difficulty}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-white" />
                        </div>

                        <div className="relative group">
                            <select
                                value={filters.bloom}
                                onChange={(event) => handleFilterChange('bloom', event.target.value)}
                                className="appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-9 text-xs font-bold text-slate-200 outline-none transition-colors hover:bg-white/10 focus:border-indigo-400 cursor-pointer"
                            >
                                <option value="all" className="bg-slate-900">Bloom Level: All</option>
                                {filterOptions.blooms.map((bloom) => (
                                    <option key={bloom} value={bloom} className="bg-slate-900">{bloom}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-white" />
                        </div>

                        <div className="relative group">
                            <select
                                value={filters.outcome}
                                onChange={(event) => handleFilterChange('outcome', event.target.value)}
                                className="appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-9 text-xs font-bold text-slate-200 outline-none transition-colors hover:bg-white/10 focus:border-indigo-400 cursor-pointer max-w-[200px] truncate"
                            >
                                <option value="all" className="bg-slate-900">Outcome: All</option>
                                {filterOptions.outcomes.map((outcome) => (
                                    <option key={outcome} value={outcome} className="bg-slate-900">{outcome}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-white" />
                        </div>

                        <div className="relative group">
                            <select
                                value={filters.status}
                                onChange={(event) => handleFilterChange('status', event.target.value)}
                                className="appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-9 text-xs font-bold text-slate-200 outline-none transition-colors hover:bg-white/10 focus:border-indigo-400 cursor-pointer"
                            >
                                <option value="all" className="bg-slate-900">Status: All</option>
                                <option value="attempted" className="bg-slate-900">Attempted</option>
                                <option value="unattempted" className="bg-slate-900">Unattempted</option>
                                <option value="bookmarked" className="bg-slate-900">Bookmarked</option>
                                <option value="correct" className="bg-slate-900">Correct</option>
                                <option value="incorrect" className="bg-slate-900">Incorrect</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-white" />
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-rose-400 transition-colors hover:bg-rose-500/20"
                            >
                                <X size={12} />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                    {filteredUnits.map((unit, unitIndex) => (
                        <UnitAccordion
                            key={unit.lesson_id}
                            unit={unit}
                            unitIndex={unitIndex}
                            isOpen={openUnitId === unit.lesson_id}
                            onToggleUnit={() => toggleUnit(unit.lesson_id)}
                            activeTopicId={activeTopicId}
                            onToggleTopic={toggleTopic}
                            topicQuestionIndexes={topicQuestionIndexes}
                            answers={answers}
                            submissions={submissions}
                            bookmarks={bookmarks}
                            explanationVisibility={explanationVisibility}
                            mode={mode}
                            onSelectOption={handleSelectOption}
                            onSubmitAnswer={handleSubmitAnswer}
                            onToggleExplanation={handleToggleExplanation}
                            onToggleBookmark={handleToggleBookmark}
                            onQuestionIndexChange={handleQuestionIndexChange}
                            onLaunchQuiz={onLaunchQuiz}
                            onMarkTopicComplete={onMarkTopicComplete}
                            completedLessons={completedLessons}
                            completingLessonId={completingLessonId}
                            getTopicProgress={getTopicProgress}
                            pendingQuestionId={pendingQuestionId}
                        />
                    ))}

                    {filteredUnits.length === 0 && (
                        <div className="rounded-[2rem] border border-slate-100 bg-white px-6 py-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900">
                            <Sparkles size={22} className="mx-auto text-indigo-500" />
                            <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">No matching questions found</p>
                            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                Try a broader search keyword to surface more topics or concepts.
                            </p>
                        </div>
                    )}
                </div>

                <AnalyticsSidebar
                    analytics={analytics}
                    analyticsStatus={analyticsStatus}
                    currentYearLabel={currentYearLabel}
                    moduleTitle={moduleTitle}
                />
            </div>
        </section>
    );
}

export default MCQWorkspace;
