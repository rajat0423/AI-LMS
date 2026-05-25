import ScoreCircle from '../ScoreCircle';

function StatCard({ label, value, accent = 'indigo' }) {
    const accents = {
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
        amber: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
        slate: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    };

    return (
        <div className={`rounded-2xl border px-4 py-4 ${accents[accent]}`}>
            <p className="text-[11px] font-black uppercase tracking-widest opacity-70">{label}</p>
            <p className="mt-2 text-lg font-extrabold">{value}</p>
        </div>
    );
}

function AnalyticsSidebar({ analytics, analyticsStatus = 'idle', currentYearLabel, moduleTitle }) {
    const weakAreas = analytics.weakAreas || [];
    const isUsingBackend = analytics.source === 'backend';
    const statusLabel = analyticsStatus === 'loading'
        ? 'Syncing'
        : analyticsStatus === 'error'
            ? 'Local'
            : isUsingBackend
                ? 'Live'
                : 'Local';

    return (
        <aside className="space-y-6 xl:sticky xl:top-24">
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Curriculum Snapshot</p>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                        isUsingBackend
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                        {statusLabel}
                    </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{moduleTitle}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{currentYearLabel}</p>

                <div className="mt-6 flex items-center justify-center">
                    <ScoreCircle value={analytics.accuracyPercentage} size={132} strokeWidth={10} />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <StatCard label="Units" value={analytics.totalUnits} />
                    <StatCard label="Questions" value={analytics.totalQuestions} accent="slate" />
                    <StatCard label="Attempted" value={analytics.attemptedCount} accent="emerald" />
                    <StatCard label="Bookmarks" value={analytics.bookmarkedCount} accent="amber" />
                </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Progress Metrics</p>
                <div className="mt-5 space-y-4">
                    <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                            <span>Topic Completion</span>
                            <span>{analytics.topicCompletionPercentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${analytics.topicCompletionPercentage}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                            <span>Question Attempts</span>
                            <span>{analytics.questionCompletionPercentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${analytics.questionCompletionPercentage}%` }} />
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3">
                    <StatCard label="Correct Answers" value={analytics.correctCount} accent="emerald" />
                    <StatCard label="Completed Topics" value={`${analytics.completedTopics}/${analytics.totalTopics}`} accent="slate" />
                </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Weak Areas</p>
                <div className="mt-4 space-y-3">
                    {weakAreas.length > 0 ? weakAreas.map((topic) => (
                        <div key={topic.lessonId} className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 dark:border-rose-800 dark:bg-rose-900/20">
                            <p className="text-sm font-bold text-rose-800 dark:text-rose-200">{topic.title}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-rose-500">
                                {topic.accuracy}% accuracy - {topic.attempted}/{topic.totalQuestions} attempted
                            </p>
                        </div>
                    )) : (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Start attempting questions to identify weak areas.
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

export default AnalyticsSidebar;
