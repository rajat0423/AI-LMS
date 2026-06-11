import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiUrl, getApiConfigurationError } from '../api';
import ScoreCircle from '../components/ScoreCircle';
import { useAuth } from '../context/useAuth';
import { getAuthHeaders } from '../services/api';
import BackButton from '../components/BackButton';
import {
    BookOpen, CheckCircle2, CloudUpload, FileText, Lock, CalendarDays, Clock,
    Info, AlertTriangle, Sparkles, PenLine, ChevronDown, ChevronUp, RefreshCw,
    Type, AlignLeft, X
} from 'lucide-react';

/* ─────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────── */

function createBlogForm() {
    return { title: '', content: '' };
}

function getWordCount(text) {
    const normalized = text.trim();
    return normalized ? normalized.split(/\s+/).length : 0;
}

function getParagraphCount(text) {
    return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;
}

function parseApiResponse(raw) {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
}

function formatPublishedDate(value) {
    try {
        return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    } catch { return value; }
}

function getBlogDraftSignature({ title, content }) {
    return `${title.trim()}::${content.trim()}`;
}

function getScoreTone(score) {
    if (score >= 80) return 'strong';
    if (score >= 65) return 'good';
    if (score >= 50) return 'fair';
    return 'needs-work';
}

function getScoreLabel(score) {
    if (score >= 80) return 'Strong draft';
    if (score >= 65) return 'Good foundation';
    if (score >= 50) return 'Needs revision';
    return 'Needs major revision';
}

const scoreToneColors = {
    strong: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    good: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    fair: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    'needs-work': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
};

/* ─────────────────────────────────────────────
   TOAST (local, auto-dismiss)
   ───────────────────────────────────────────── */

function StatusBar({ status }) {
    const colors = {
        info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        error: 'bg-red-50 text-red-700 border-red-200',
    };
    const icons = {
        info: <Info size={16} className="shrink-0" />,
        success: <CheckCircle2 size={16} className="shrink-0" />,
        error: <AlertTriangle size={16} className="shrink-0" />,
    };
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={status.text}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium shadow-sm ${colors[status.type] || colors.info}`}
            >
                {icons[status.type] || icons.info}
                <span className="leading-snug">{status.text}</span>
            </motion.div>
        </AnimatePresence>
    );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */

function BlogWriter() {
    const { user, token } = useAuth();
    const libraryRef = useRef(null);
    const [blogForm, setBlogForm] = useState(() => createBlogForm());
    const [reviewReport, setReviewReport] = useState(null);
    const [reviewedSignature, setReviewedSignature] = useState('');
    const [publishedBlogs, setPublishedBlogs] = useState([]);
    const [expandedBlogId, setExpandedBlogId] = useState(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
    const [status, setStatus] = useState({
        type: 'info',
        text: 'Write your blog draft, run the publish check, and then publish it privately to your account.',
    });

    useEffect(() => {
        if (!user?.email) { setPublishedBlogs([]); return; }
        const loadPublishedBlogs = async () => {
            setIsLoadingBlogs(true);
            try {
                const configurationError = getApiConfigurationError();
                if (configurationError) throw new Error(configurationError);
                const response = await fetch(
                    apiUrl(`/api/v1/blog/published?author_email=${encodeURIComponent(user.email)}`),
                    { headers: getAuthHeaders(token) }
                );
                const result = await response.json();
                if (!response.ok) throw new Error(result.detail || 'Could not load your published blogs.');
                setPublishedBlogs(Array.isArray(result.blogs) ? result.blogs : []);
            } catch (error) {
                console.error('Published blog fetch failed:', error);
                setStatus({ type: 'error', text: error.message || 'Could not load your published blogs.' });
            } finally { setIsLoadingBlogs(false); }
        };
        loadPublishedBlogs();
    }, [user?.email]);

    const updateBlogForm = (field, value) => setBlogForm((prev) => ({ ...prev, [field]: value }));

    const currentUserName = user?.name || '';
    const currentUserEmail = user?.email || '';
    const currentDraftSignature = getBlogDraftSignature(blogForm);
    const wordCount = getWordCount(blogForm.content);
    const paragraphCount = getParagraphCount(blogForm.content);
    const isReviewCurrent = Boolean(reviewReport) && reviewedSignature === currentDraftSignature;
    const scoreTone = getScoreTone(reviewReport?.qualityScore || 0);
    const toneStyle = scoreToneColors[scoreTone] || scoreToneColors['needs-work'];

    const handleRunPublishCheck = async () => {
        if (!blogForm.content.trim()) {
            setStatus({ type: 'error', text: 'Write the blog content before running the publish check.' });
            return;
        }
        setIsReviewing(true);
        setStatus({ type: 'info', text: 'Checking grammar, professional language, and blog format…' });

        try {
            const configurationError = getApiConfigurationError();
            if (configurationError) throw new Error(configurationError);
            const response = await fetch(apiUrl('/api/v1/blog/assist'), {
                method: 'POST',
                headers: getAuthHeaders(token),
                body: JSON.stringify({
                    action: 'publish_check',
                    title: blogForm.title,
                    content: blogForm.content,
                    author_name: currentUserName,
                    author_email: currentUserEmail,
                }),
            });
            const rawResponse = await response.text();
            const result = parseApiResponse(rawResponse);
            if (!response.ok) throw new Error(result.detail || 'Publish check failed.');

            setReviewReport({
                actionLabel: result.action_label || 'Publish Check',
                qualityScore: Number.isFinite(result.quality_score) ? result.quality_score : 0,
                reportSummary: result.report_summary || '',
                preview: result.preview || '',
                grammarMistakes: Array.isArray(result.grammar_mistakes) ? result.grammar_mistakes : [],
                suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
                assistantNote: result.assistant_note || '',
            });
            setReviewedSignature(currentDraftSignature);
            setStatus({ type: 'success', text: 'Publish check completed. Review the report and publish when ready.' });
        } catch (error) {
            console.error('Publish check failed:', error);
            setStatus({ type: 'error', text: error.message || 'Publish check failed.' });
        } finally { setIsReviewing(false); }
    };

    const handlePublish = async () => {
        if (!blogForm.title.trim()) { setStatus({ type: 'error', text: 'Add a title before publishing.' }); return; }
        if (!blogForm.content.trim()) { setStatus({ type: 'error', text: 'Write the blog content before publishing.' }); return; }
        if (!currentUserEmail.trim()) { setStatus({ type: 'error', text: 'A signed-in email is required to publish.' }); return; }
        if (!reviewReport || !isReviewCurrent) { setStatus({ type: 'error', text: 'Run the publish check on the current draft before publishing.' }); return; }

        setIsPublishing(true);
        setStatus({ type: 'info', text: 'Publishing privately to your account…' });

        try {
            const configurationError = getApiConfigurationError();
            if (configurationError) throw new Error(configurationError);
            const response = await fetch(apiUrl('/api/v1/blog/publish'), {
                method: 'POST',
                headers: getAuthHeaders(token),
                body: JSON.stringify({
                    author_name: currentUserName,
                    author_email: currentUserEmail,
                    title: blogForm.title,
                    content: blogForm.content,
                    quality_score: reviewReport.qualityScore,
                    grammar_mistake_count: reviewReport.grammarMistakes.length,
                    suggestion_count: reviewReport.suggestions.length,
                    review_summary: reviewReport.reportSummary,
                }),
            });
            const rawResponse = await response.text();
            const result = parseApiResponse(rawResponse);
            if (!response.ok) throw new Error(result.detail || 'Publishing failed.');

            setPublishedBlogs((prev) => [result, ...prev]);
            setExpandedBlogId(result.id || null);
            setStatus({ type: 'success', text: 'Your blog has been published privately and saved to your account.' });
            libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            console.error('Publishing failed:', error);
            setStatus({ type: 'error', text: error.message || 'Publishing failed.' });
        } finally { setIsPublishing(false); }
    };

    /* ── RENDER ───────────────────────────────── */

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-6">
            <BackButton />
            {/* Status Bar */}
            <StatusBar status={status} />

            {/* Main Grid: Editor + Review Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.88fr] gap-6 items-start">

                {/* ═══════════  EDITOR CARD  ═══════════ */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6 sm:p-8 flex flex-col gap-6">

                    {/* Header */}
                    <div className="flex items-start gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
                            <PenLine size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.12em] mb-1">Writing Studio</p>
                            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-heading">Private Blog Writing</h2>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Write your blog, run a publish check, then save it privately to your account.</p>
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-3 justify-end">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                            <Type size={13} /> {wordCount} words
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                            <AlignLeft size={13} /> {paragraphCount} paragraphs
                        </span>
                    </div>

                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Blog Title</label>
                        <input
                            type="text"
                            placeholder="e.g. What I Learned During My First Internship Interview"
                            value={blogForm.title}
                            onChange={(e) => updateBlogForm('title', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {/* Content Textarea */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Blog Content</label>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Write the full blog here. Publishing unlocks only after the draft passes the publish check.</p>
                        <textarea
                            placeholder={'Start writing your blog here...\n\nExample:\nToday I want to share what changed in my approach to preparing for placement interviews and why consistency mattered more than confidence in the beginning.'}
                            rows={14}
                            value={blogForm.content}
                            onChange={(e) => updateBlogForm('content', e.target.value)}
                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all resize-y leading-[1.85]"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={handleRunPublishCheck}
                            disabled={isReviewing || isPublishing}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isReviewing
                                ? <><RefreshCw size={16} className="animate-spin" /> Checking…</>
                                : <><Sparkles size={16} className="text-indigo-500" /> Run Publish Check</>}
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={!isReviewCurrent || isReviewing || isPublishing}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-md shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {isPublishing
                                ? <><RefreshCw size={16} className="animate-spin" /> Publishing…</>
                                : <><CloudUpload size={16} /> Publish Privately</>}
                        </button>
                    </div>

                    {/* Hint */}
                    <p className={`text-xs text-right leading-relaxed ${isReviewCurrent ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        {isReviewCurrent
                            ? '✓ Current draft has been checked. Publishing is unlocked.'
                            : reviewReport
                                ? 'You changed the draft after the last check. Run Publish Check again.'
                                : 'Run Publish Check once before publishing this draft.'}
                    </p>
                </motion.div>

                {/* ═══════════  REVIEW PANEL  ═══════════ */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6 sm:p-8 xl:sticky xl:top-[92px] flex flex-col gap-5">

                    {/* Header */}
                    <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={22} className="text-violet-600" />
                        </div>
                        <div>
                            <p className="text-xs font-extrabold text-violet-600 uppercase tracking-[0.12em] mb-1">Pre-publish Report</p>
                            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight font-heading">Draft Review</h2>
                        </div>
                    </div>

                    {/* Connection status */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Draft Status</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                            isReviewCurrent
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : reviewReport
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            {isReviewCurrent ? '✓ Review Ready' : reviewReport ? '⟳ Draft Changed' : 'Awaiting Check'}
                        </span>
                    </div>

                    {reviewReport ? (
                        <div className="flex flex-col gap-5">
                            {/* Score Hero */}
                            <div className={`rounded-2xl p-5 border ${toneStyle.bg} ${toneStyle.border}`}>
                                <div className="flex items-center gap-5">
                                    <ScoreCircle value={reviewReport.qualityScore} size={90} strokeWidth={9} />
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quality Score</span>
                                        <h3 className={`text-lg font-extrabold mt-0.5 ${toneStyle.text}`}>{getScoreLabel(reviewReport.qualityScore)}</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{reviewReport.reportSummary || 'Quality report generated for the current draft.'}</p>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    {[
                                        { label: 'Score', value: `${reviewReport.qualityScore}%` },
                                        { label: 'Issues', value: reviewReport.grammarMistakes.length },
                                        { label: 'Tips', value: reviewReport.suggestions.length },
                                    ].map((s) => (
                                        <div key={s.label} className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 p-3 text-center">
                                            <p className="text-xl font-extrabold text-slate-800">{s.value}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Review Note */}
                            <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Review Note</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{reviewReport.assistantNote || 'The review focused on grammar, professional language, and blog format.'}</p>
                            </div>

                            {/* Feedback Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                                {/* Grammar */}
                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Grammar Mistakes</p>
                                    {reviewReport.grammarMistakes.length > 0 ? (
                                        <ul className="space-y-2">
                                            {reviewReport.grammarMistakes.map((issue, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                                    {issue}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-emerald-600 font-medium">No grammar mistakes detected ✓</p>
                                    )}
                                </div>

                                {/* Suggestions */}
                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Suggestions</p>
                                    {reviewReport.suggestions.length > 0 ? (
                                        <ul className="space-y-2">
                                            {reviewReport.suggestions.map((suggestion, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                                    {suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-emerald-600 font-medium">No suggestions needed ✓</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                                <FileText size={24} className="text-violet-400" />
                            </div>
                            <h3 className="text-base font-bold text-slate-700 mb-1">No report yet</h3>
                            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                                Run the publish check to review grammar, professional language, and the quality score.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* ═══════════  PUBLISHED BLOGS LIBRARY  ═══════════ */}
            <motion.div ref={libraryRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6 sm:p-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-[0.12em] mb-1">Private Library</p>
                        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight font-heading">Published Blogs</h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                        {publishedBlogs.length} saved
                    </span>
                </div>

                {isLoadingBlogs ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={22} className="text-indigo-400 animate-spin" />
                        <span className="ml-3 text-sm text-slate-400 font-medium">Loading your published blogs…</span>
                    </div>
                ) : publishedBlogs.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {publishedBlogs.map((blog) => {
                            const isExpanded = expandedBlogId === blog.id;
                            const estimatedReadMinutes = Math.max(1, Math.ceil((Number(blog.word_count) || 0) / 200));
                            const hasScore = typeof blog.quality_score === 'number' && blog.quality_score >= 0;

                            return (
                                <article key={blog.id}
                                    className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-lg dark:hover:shadow-none hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all group relative">
                                    {/* Top gradient bar */}
                                    <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

                                    <div className="p-5 sm:p-6">
                                        {/* Top line */}
                                        <div className="flex items-center justify-between gap-3 mb-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                                                <Lock size={11} /> Private
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                <CalendarDays size={13} /> {formatPublishedDate(blog.published_at)}
                                            </span>
                                        </div>

                                        {/* Title + Score */}
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base font-bold text-slate-800 leading-snug mb-2">{blog.title}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                                                        {blog.word_count} words
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                                                        <Clock size={10} /> {estimatedReadMinutes} min
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                                                        {blog.grammar_mistake_count || 0} issues
                                                    </span>
                                                </div>
                                            </div>
                                            {hasScore && (
                                                <div className="shrink-0 flex flex-col items-center">
                                                    <ScoreCircle value={blog.quality_score} size={64} strokeWidth={7} />
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Score</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Review Summary */}
                                        {blog.review_summary && (
                                            <p className="text-xs text-slate-400 leading-relaxed mt-3">{blog.review_summary}</p>
                                        )}

                                        {/* Preview */}
                                        <div className="mt-4 px-4 py-3 bg-slate-50/80 rounded-xl border border-slate-100">
                                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{blog.preview}</p>
                                        </div>

                                        {/* Toggle */}
                                        <button
                                            onClick={() => setExpandedBlogId(isExpanded ? null : blog.id)}
                                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                                        >
                                            {isExpanded ? <><ChevronUp size={14} /> Hide full post</> : <><ChevronDown size={14} /> Read full post</>}
                                        </button>

                                        {/* Expanded content */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-4 p-5 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-[1.85]">
                                                        {blog.content.split('\n').map((line, index) => (
                                                            <p key={`${blog.id}-${index}`} className={line.trim() ? '' : 'h-4'}>
                                                                {line || '\u00A0'}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty Library */
                    <div className="flex flex-col items-center justify-center text-center py-14 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                            <BookOpen size={24} className="text-indigo-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-700 mb-1">No published blogs yet</h3>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                            Publish your checked draft privately and it will appear here under your account.
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

export default BlogWriter;
