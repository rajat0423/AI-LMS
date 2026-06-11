import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, Lightbulb } from 'lucide-react';

function getOptionState(optionId, currentAnswer, submission, mode) {
    if (!submission) {
        return currentAnswer === optionId ? 'selected' : 'default';
    }

    if (mode === 'exam') {
        return currentAnswer === optionId ? 'selected' : 'default';
    }

    if (optionId === submission.correctOptionId) {
        return 'correct';
    }

    if (optionId === submission.selectedOptionId && !submission.isCorrect) {
        return 'incorrect';
    }

    return 'default';
}

function optionClasses(state) {
    if (state === 'correct') {
        return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100';
    }
    if (state === 'incorrect') {
        return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-100';
    }
    if (state === 'selected') {
        return 'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-100';
    }
    return 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-slate-800/70';
}

function MetaBadge({ children, tone = 'default' }) {
    const tones = {
        default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        primary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest ${tones[tone]}`}>
            {children}
        </span>
    );
}

function QuestionCard({
    question,
    questionNumber,
    totalQuestions,
    currentAnswer,
    submission,
    showExplanation,
    isBookmarked,
    mode,
    canReviewAnswer,
    onSelectOption,
    onSubmitAnswer,
    onToggleExplanation,
    onToggleBookmark,
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
    isSaving = false,
    questions = [],
    currentIndex = 0,
    onJumpToQuestion,
    submissions = {},
}) {
    const canShowAnswerFeedback = mode !== 'exam' || canReviewAnswer;
    const effectiveMode = canShowAnswerFeedback ? 'learning' : mode;
    const explanationButtonLabel = mode === 'exam' && !canReviewAnswer
        ? 'Finish Topic to Review'
        : showExplanation
            ? 'Hide Explanation'
            : 'Show Explanation';

    return (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900">
            {/* Question Navigator */}
            {questions && questions.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-5 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Jump to:</span>
                    <div className="flex flex-wrap gap-2">
                        {questions.map((q, idx) => {
                            const sub = submissions[q.question_id];
                            const isActive = idx === currentIndex;
                            
                            // Determine style based on attempt correctness & active state
                            let bgClass = "bg-slate-50 text-slate-650 hover:bg-slate-100 border-slate-200 dark:bg-slate-800/40 dark:text-slate-350 dark:border-slate-700";
                            
                            if (sub) {
                                if (effectiveMode === 'exam') {
                                    bgClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60";
                                } else if (sub.isCorrect) {
                                    bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
                                } else {
                                    bgClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-450 dark:border-rose-900/60";
                                }
                            }
                            
                            const activeOutline = isActive
                                ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 font-extrabold"
                                : "font-semibold";

                            return (
                                <button
                                    key={q.question_id}
                                    type="button"
                                    onClick={() => onJumpToQuestion && onJumpToQuestion(idx)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs transition-all ${bgClass} ${activeOutline}`}
                                    title={`Question ${idx + 1}${sub ? (sub.isCorrect ? ' (Correct)' : ' (Incorrect)') : ' (Unattempted)'}`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-5">
                <MetaBadge tone="primary">{question.difficulty_level || 'Moderate'}</MetaBadge>
                <MetaBadge tone="warning">{question.blooms_level || 'Understand'}</MetaBadge>
                <MetaBadge>{question.course_outcome || 'CO1'}</MetaBadge>
                <MetaBadge tone="success">{question.question_code || `Q${questionNumber}`}</MetaBadge>
                <span className="ml-auto text-xs font-bold uppercase tracking-widest text-slate-400">
                    Question {questionNumber} of {totalQuestions}
                </span>
            </div>

            <h4 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-relaxed mb-6">
                {question.text}
            </h4>

            <fieldset className="space-y-3" aria-label={`Question ${questionNumber} options`}>
                {question.options.map((option, index) => {
                    const optionState = getOptionState(option.option_id, currentAnswer, submission, effectiveMode);
                    const optionLabel = String.fromCharCode(65 + index);
                    return (
                        <label
                            key={option.option_id}
                            className={`flex cursor-pointer items-start gap-4 rounded-2xl border px-4 py-4 transition-all ${optionClasses(optionState)}`}
                        >
                            <input
                                type="radio"
                                name={`question-${question.question_id}`}
                                value={option.option_id}
                                checked={currentAnswer === option.option_id}
                                onChange={() => onSelectOption(question.question_id, option.option_id)}
                                className="sr-only"
                            />
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/70 text-xs font-black dark:bg-slate-950/60">
                                {optionLabel}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-relaxed">{option.text}</p>
                            </div>
                        </label>
                    );
                })}
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                    onClick={onSubmitAnswer}
                    disabled={!currentAnswer || isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <CheckCircle2 size={16} />
                    {isSaving ? 'Saving...' : submission ? 'Resubmit Answer' : 'Submit Answer'}
                </button>

                <button
                    onClick={onToggleExplanation}
                    disabled={!submission || !canShowAnswerFeedback}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <Lightbulb size={16} />
                    {explanationButtonLabel}
                </button>

                <button
                    onClick={onToggleBookmark}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                        isBookmarked
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                >
                    {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                    {(question.concepts_tested || []).map((concept) => (
                        <span
                            key={concept}
                            className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                        >
                            #{concept}
                        </span>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onPrevious}
                        disabled={!hasPrevious}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft size={15} />
                        Previous
                    </button>
                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                    >
                        Next
                        <ArrowRight size={15} />
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {showExplanation && submission && canShowAnswerFeedback && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 dark:border-indigo-800 dark:bg-indigo-900/20">
                            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                Correct Answer: {submission.correctOptionText || 'Not available'}
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                                {question.explanation || 'Explanation will be available here when configured.'}
                            </p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                                {question.placement_relevance}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default QuestionCard;
