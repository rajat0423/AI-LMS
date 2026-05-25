import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, CheckCircle2, ChevronDown, ClipboardList, Loader2, Sparkles } from 'lucide-react';
import QuestionCard from './QuestionCard';

function TopicSummary({ topic, progress, isCompleted, isActive, onToggle, onLaunchQuiz, onMarkComplete, isCompleting }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <button onClick={onToggle} className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}>
                            {isCompleted ? <CheckCircle2 size={18} /> : <BookOpen size={18} />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-base font-bold text-slate-900 dark:text-white">{topic.title}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                                {topic.question_count} Questions · {progress.accuracy}% Accuracy
                            </p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                            <span>Topic Progress</span>
                            <span>{progress.completion}% Completed</span>
                        </div>
                        <div className="h-2 rounded-full bg-white dark:bg-slate-900">
                            <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${progress.completion}%` }} />
                        </div>
                    </div>
                </button>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onLaunchQuiz}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-amber-600"
                    >
                        <ClipboardList size={14} />
                        Open Full Quiz
                    </button>
                    <button
                        onClick={onMarkComplete}
                        disabled={isCompleted || isCompleting}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {isCompleted ? 'Completed' : isCompleting ? 'Saving' : 'Complete Topic'}
                    </button>
                </div>
            </div>

            {isActive && (
                <div className="mt-4 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-600 dark:border-indigo-800 dark:bg-slate-900 dark:text-slate-300">
                    {topic.content}
                </div>
            )}
        </div>
    );
}

function UnitAccordion({
    unit,
    unitIndex,
    isOpen,
    onToggleUnit,
    activeTopicId,
    onToggleTopic,
    topicQuestionIndexes,
    answers,
    submissions,
    bookmarks,
    explanationVisibility,
    mode,
    onSelectOption,
    onSubmitAnswer,
    onToggleExplanation,
    onToggleBookmark,
    onQuestionIndexChange,
    onLaunchQuiz,
    onMarkTopicComplete,
    completedLessons,
    completingLessonId,
    getTopicProgress,
    pendingQuestionId,
}) {
    return (
        <div className={`rounded-[2rem] border transition-all duration-300 ${isOpen ? 'border-indigo-200 bg-white shadow-[0_20px_60px_-15px_rgba(79,70,229,0.1)] dark:border-indigo-900/50 dark:bg-slate-900' : 'border-slate-100 bg-white hover:border-indigo-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'}`}>
            <button
                onClick={onToggleUnit}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Unit {unitIndex + 1}</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{unit.title}</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                        {unit.topic_count} Topics · {unit.question_count} Questions
                    </p>
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={22} className="text-slate-400" />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-slate-100 px-6 py-6 dark:border-slate-800">
                            <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{unit.content}</p>

                            <div className="space-y-5">
                                {unit.topics.map((topic) => {
                                    const progress = getTopicProgress(topic);
                                    const visibleQuestions = topic.questions || [];
                                    const lastQuestionIndex = Math.max(0, visibleQuestions.length - 1);
                                    const questionIndex = Math.min(topicQuestionIndexes[topic.lesson_id] || 0, lastQuestionIndex);
                                    const question = visibleQuestions[questionIndex];
                                    const isTopicActive = activeTopicId === topic.lesson_id;
                                    const isTopicExamComplete = visibleQuestions.length > 0
                                        && visibleQuestions.every((item) => submissions[item.question_id]);
                                    const canReviewAnswer = mode !== 'exam' || isTopicExamComplete;

                                    return (
                                        <div key={topic.lesson_id} className="space-y-4">
                                            <TopicSummary
                                                topic={topic}
                                                progress={progress}
                                                isCompleted={completedLessons.has(topic.lesson_id)}
                                                isActive={isTopicActive}
                                                onToggle={() => onToggleTopic(topic.lesson_id)}
                                                onLaunchQuiz={() => onLaunchQuiz(topic.lesson_id)}
                                                onMarkComplete={() => onMarkTopicComplete(topic.lesson_id)}
                                                isCompleting={completingLessonId === topic.lesson_id}
                                            />

                                            <AnimatePresence initial={false}>
                                                {isTopicActive && question && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                                                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                                                <div>
                                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Learning Workspace</p>
                                                                    <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                                                                        {progress.attempted}/{topic.original_question_count || topic.question_count} attempted · {progress.correct} correct
                                                                    </p>
                                                                </div>
                                                                <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300">
                                                                    <Sparkles size={14} />
                                                                    {mode} mode
                                                                </div>
                                                            </div>

                                                            <QuestionCard
                                                                question={question}
                                                                questionNumber={questionIndex + 1}
                                                                totalQuestions={topic.question_count}
                                                                currentAnswer={answers[question.question_id] || ''}
                                                                submission={submissions[question.question_id]}
                                                                showExplanation={!!explanationVisibility[question.question_id]}
                                                                isBookmarked={!!bookmarks[question.question_id]}
                                                                mode={mode}
                                                                canReviewAnswer={canReviewAnswer}
                                                                onSelectOption={onSelectOption}
                                                                onSubmitAnswer={() => onSubmitAnswer(topic, question)}
                                                                onToggleExplanation={() => onToggleExplanation(question.question_id)}
                                                                onToggleBookmark={() => onToggleBookmark(question.question_id)}
                                                                onPrevious={() => onQuestionIndexChange(topic.lesson_id, Math.max(0, questionIndex - 1))}
                                                                onNext={() => onQuestionIndexChange(topic.lesson_id, Math.min(lastQuestionIndex, questionIndex + 1))}
                                                                hasPrevious={questionIndex > 0}
                                                                hasNext={questionIndex < lastQuestionIndex}
                                                                isSaving={pendingQuestionId === question.question_id}
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default UnitAccordion;
