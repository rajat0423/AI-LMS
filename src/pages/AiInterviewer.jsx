import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, RefreshCw, Bot, User, Settings2, Briefcase,
    ChevronRight, Sparkles, FileText, Upload, X, Loader2,
    PanelRightClose, PanelRightOpen, ArrowLeft, Target, Zap
} from 'lucide-react';
import { apiUrl, getApiConfigurationError } from '../api';
import { useAuth } from '../context/useAuth';
import { useGlobalUser } from '../context/useGlobalUser';

const MAX_RESUME_FILE_SIZE_BYTES = 4 * 1024 * 1024;

const difficultyOptions = [
    { id: 'easy_fresher', label: 'Fresher', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'medium', label: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'hard', label: 'Hard', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const interviewTypeOptions = [
    { id: 'hr', label: 'HR', icon: Briefcase, desc: 'Behavioral & soft skills' },
    { id: 'technical', label: 'Technical', icon: Target, desc: 'Domain & problem solving' },
];

function AiInterviewer() {
    const { user, token } = useAuth();
    const { refreshUserData } = useGlobalUser();
    const chatEndRef = useRef(null);

    // Setup state
    const [stage, setStage] = useState('setup');
    const [targetRole, setTargetRole] = useState('');
    const [domain, setDomain] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [interviewType, setInterviewType] = useState('technical');
    const [difficulty, setDifficulty] = useState('easy_fresher');
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeAnalysis, setResumeAnalysis] = useState(null);

    // Chat state
    const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
    const [interviewSetup, setInterviewSetup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isPreparing, setIsPreparing] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [error, setError] = useState('');
    const [feedbackReport, setFeedbackReport] = useState(null);
    const [liveFeedback, setLiveFeedback] = useState(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // ── Quick Start (no setup, jump straight to chat) ─────────────────
    const handleQuickStart = async () => {
        setIsPreparing(true);
        let sessionDbId = null;
        try {
            const resSession = await fetch(apiUrl('/api/v1/my/interview-sessions'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    role_applied: 'general',
                    job_description: 'General professional interview'
                })
            });
            if (resSession.ok) {
                const sessionData = await resSession.json();
                sessionDbId = sessionData.session_id;
            }
        } catch (e) {
            console.error("Failed to create quick session on backend:", e);
        }

        if (!sessionDbId) {
            sessionDbId = crypto.randomUUID();
        }

        const payload = {
            target_role: 'general',
            company_name: '',
            domain: 'general',
            interview_type: 'technical',
            difficulty: 'easy_fresher',
            candidate_name: user?.name || '',
            candidate_background: '',
            key_points: [],
        };
        setInterviewSetup(payload);
        await startInterviewSession(payload, sessionDbId);
    };

    // ── Full Setup Start ─────────────────────────────────────────────
    const handleSetupStart = async () => {
        if (!targetRole.trim()) { setError('Enter a target role'); return; }
        if (!domain.trim()) { setError('Enter a domain'); return; }
        setError('');
        setIsPreparing(true);

        let analysis = null;
        if (resumeFile) {
            try {
                const configurationError = getApiConfigurationError();
                if (configurationError) throw new Error(configurationError);
                const formData = new FormData();
                formData.append('resume', resumeFile);
                formData.append('job_description', `${targetRole.trim()} ${domain.trim()} ${interviewType} interview`);
                const response = await fetch(apiUrl('/api/v1/my/resume-analyses'), {
                    method: 'POST',
                    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                    body: formData,
                });
                if (response.ok) {
                    analysis = await response.json();
                    setResumeAnalysis(analysis);
                }
            } catch (e) {
                console.error('Resume analysis failed:', e);
            }
        }

        let sessionDbId = null;
        try {
            const resSession = await fetch(apiUrl('/api/v1/my/interview-sessions'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    role_applied: targetRole.trim(),
                    job_description: `${targetRole.trim()} ${domain.trim()} ${interviewType} interview`
                })
            });
            if (resSession.ok) {
                const sessionData = await resSession.json();
                sessionDbId = sessionData.session_id;
            }
        } catch (e) {
            console.error("Failed to create session on backend:", e);
        }

        if (!sessionDbId) {
            sessionDbId = crypto.randomUUID();
        }

        const keyPoints = [];
        if (analysis?.details?.skillsFound?.length) {
            keyPoints.push(`Skills: ${analysis.details.skillsFound.slice(0, 8).join(', ')}`);
        }

        const payload = {
            target_role: targetRole.trim(),
            company_name: companyName.trim(),
            domain: domain.trim(),
            interview_type: interviewType,
            difficulty,
            candidate_name: user?.name || '',
            candidate_background: analysis?.improvedSummary || analysis?.summary || '',
            key_points: keyPoints,
        };
        setInterviewSetup(payload);
        await startInterviewSession(payload, sessionDbId);
    };

    // ── Core chat engine ─────────────────────────────────────────────
    const startInterviewSession = async (setupPayload, nextSessionId) => {
        setStage('chat');
        setSessionId(nextSessionId);
        setMessages([]);
        setLiveFeedback(null);
        setInput('');
        setIsPreparing(true);
        setIsTyping(true);

        try {
            const configurationError = getApiConfigurationError();
            if (configurationError) throw new Error(configurationError);

            const response = await fetch(apiUrl('/api/v1/chat'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    session_id: nextSessionId,
                    history: [],
                    message: 'Begin the interview and ask the first question.',
                    interview_setup: setupPayload,
                }),
            });

            const raw = await response.text();
            let result = {};
            if (raw) { try { result = JSON.parse(raw); } catch { /* ignore */ } }
            if (!response.ok) throw new Error(result.detail || `Failed with status ${response.status}`);

            setMessages([{ role: 'ai', text: result.reply || 'Let us begin the interview.', timestamp: new Date() }]);
            setLiveFeedback(result.feedback || null);
        } catch (e) {
            console.error('Interview start failed:', e);
            setStage('setup');
            setError(e.message || 'Could not start the interview.');
        } finally {
            setIsPreparing(false);
            setIsTyping(false);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || isTyping) return;
        const userText = input.trim();
        const nextMessages = [...messages, { role: 'user', text: userText, timestamp: new Date() }];

        setMessages(nextMessages);
        setInput('');
        setIsTyping(true);

        const history = messages.map(m => ({ role: m.role, text: m.text }));

        try {
            const configurationError = getApiConfigurationError();
            if (configurationError) throw new Error(configurationError);

            const response = await fetch(apiUrl('/api/v1/chat'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ session_id: sessionId, history, message: userText, interview_setup: interviewSetup }),
            });
            const raw = await response.text();
            let data = {};
            if (raw) { try { data = JSON.parse(raw); } catch { /* ignore */ } }
            if (!response.ok) throw new Error(data.detail || `Failed with status ${response.status}`);

            setMessages(prev => [...prev, { role: 'ai', text: data.reply || 'No reply received.', timestamp: new Date() }]);
            setLiveFeedback(data.feedback || null);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: `Error: ${e.message}`, timestamp: new Date() }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const handleReset = () => {
        setMessages([]);
        setInput('');
        setIsTyping(false);
        setLiveFeedback(null);
        if (interviewSetup) startInterviewSession(interviewSetup, crypto.randomUUID());
    };

    const handleBackToSetup = () => {
        setStage('setup');
        setMessages([]);
        setInput('');
        setIsTyping(false);
        setError('');
        setFeedbackReport(null);
        setLiveFeedback(null);
    };

    const handleFinishEarly = async () => {
        if (isTyping) return;
        const userAnswers = messages.filter(m => m.role === 'user').map(m => m.text);
        if (userAnswers.length === 0) {
            handleBackToSetup();
            return;
        }

        while (userAnswers.length < 3) {
            userAnswers.push("No response provided.");
        }

        setIsTyping(true);
        try {
            const completeRes = await fetch(apiUrl(`/api/v1/my/interview-sessions/${sessionId}/complete`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    answers: userAnswers
                })
            });
            if (completeRes.ok) {
                const feedbackData = await completeRes.json();
                setFeedbackReport(feedbackData);
                refreshUserData();
            } else {
                handleBackToSetup();
            }
        } catch (e) {
            console.error(e);
            handleBackToSetup();
        } finally {
            setIsTyping(false);
        }
    };

    const handleResumeChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_RESUME_FILE_SIZE_BYTES) { setError('Resume must be under 4 MB'); return; }
        if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Only PDF files accepted'); return; }
        setResumeFile(file);
        setError('');
    };

    // ═══════════════════════════════════════════════════════════════════
    // FEEDBACK REPORT SCREEN — Premium analysis view
    // ═══════════════════════════════════════════════════════════════════
    if (feedbackReport) {
        return (
            <div className="w-full max-w-[1000px] mx-auto px-4 py-8 flex flex-col gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 flex flex-col gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 rounded-full">
                                Analysis Completed
                            </span>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-3 font-heading">
                                Interview Feedback Report
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-bold">
                                Role: {feedbackReport.role_applied}
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center shrink-0 w-28 h-28 rounded-full bg-indigo-50 dark:bg-slate-800 border-4 border-indigo-600 dark:border-indigo-500">
                            <span className="text-3xl font-black text-slate-800 dark:text-white">{feedbackReport.overall_score || 0}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Strengths */}
                        <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-6 rounded-2xl flex flex-col gap-3">
                            <h3 className="font-extrabold text-emerald-800 dark:text-emerald-450 uppercase tracking-widest text-xs">Strengths Detected</h3>
                            <ul className="space-y-2">
                                {feedbackReport.strengths?.map((s, idx) => (
                                    <li key={idx} className="text-sm font-semibold text-slate-700 dark:text-slate-350 list-disc list-inside leading-relaxed">{s}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Improvement Areas */}
                        <div className="bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 p-6 rounded-2xl flex flex-col gap-3">
                            <h3 className="font-extrabold text-rose-800 dark:text-rose-450 uppercase tracking-widest text-xs">Areas to Improve</h3>
                            <ul className="space-y-2">
                                {feedbackReport.improvement_areas?.map((imp, idx) => (
                                    <li key={idx} className="text-sm font-semibold text-slate-700 dark:text-slate-350 list-disc list-inside leading-relaxed">{imp}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Better Suggestions */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl flex flex-col gap-4">
                        <h3 className="font-extrabold text-slate-800 dark:text-white uppercase tracking-widest text-xs">Better Answer Suggestions</h3>
                        <div className="space-y-3">
                            {feedbackReport.better_answer_suggestions?.map((s, idx) => (
                                <p key={idx} className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">{s}</p>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => { setFeedbackReport(null); setStage('setup'); }}
                        className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all text-center uppercase tracking-wider text-sm mt-4 font-extrabold"
                    >
                        Start New Practice Session
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // SETUP SCREEN — Clean, minimal, premium
    // ═══════════════════════════════════════════════════════════════════
    if (stage === 'setup') {
        return (
            <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">

                {/* Hero Header */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
                                    <Bot size={24} className="text-indigo-300" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Interview Coach</h1>
                                    <p className="text-indigo-300 text-sm font-medium mt-0.5">Powered by Groq AI</p>
                                </div>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed max-w-xl mt-2">
                                Practice interviews with an AI that adapts to your role, domain, and experience level. Start instantly or customize your session.
                            </p>
                        </div>

                        {/* Quick Start Button */}
                        <button
                            onClick={handleQuickStart}
                            disabled={isPreparing}
                            className="group flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold rounded-2xl shadow-lg shadow-white/10 dark:shadow-none hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 shrink-0"
                        >
                            {isPreparing ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} className="text-indigo-600 dark:text-indigo-400" />}
                            Quick Start
                            <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Error bar */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="px-5 py-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm font-semibold flex items-center justify-between"
                        >
                            {error}
                            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Setup Form — Clean 2-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Left: Core Settings */}
                    <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Settings2 size={20} className="text-indigo-500 dark:text-indigo-400" />
                            Customize Your Session
                        </h2>

                        <div className="space-y-5">
                            {/* Role & Domain */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Target Role *</span>
                                    <input
                                        type="text"
                                        value={targetRole}
                                        onChange={e => setTargetRole(e.target.value)}
                                        placeholder="e.g. Frontend Developer"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Domain *</span>
                                    <input
                                        type="text"
                                        value={domain}
                                        onChange={e => setDomain(e.target.value)}
                                        placeholder="e.g. React, Data Science"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                                    />
                                </label>
                            </div>

                            {/* Company */}
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Company <span className="text-slate-400 dark:text-slate-500">(Optional)</span></span>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="e.g. Google, Infosys"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                                />
                            </label>

                            {/* Interview Type */}
                            <div>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Interview Type</span>
                                <div className="grid grid-cols-2 gap-3">
                                    {interviewTypeOptions.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setInterviewType(opt.id)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                                                interviewType === opt.id
                                                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <opt.icon size={20} className={interviewType === opt.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                                                <div>
                                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">{opt.label}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Difficulty */}
                            <div>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">Difficulty</span>
                                <div className="flex gap-3">
                                    {difficultyOptions.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setDifficulty(opt.id)}
                                            className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm text-center transition-all ${
                                                difficulty === opt.id
                                                    ? `${opt.color} border-current shadow-sm`
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleSetupStart}
                            disabled={isPreparing}
                            className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60"
                        >
                            {isPreparing ? (
                                <><Loader2 size={20} className="animate-spin" /> Preparing Interview...</>
                            ) : (
                                <><Sparkles size={20} /> Start Custom Interview</>
                            )}
                        </button>
                    </div>

                    {/* Right: Resume Upload + Tips */}
                    <div className="lg:col-span-2 flex flex-col gap-6">

                        {/* Resume Upload Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8">
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileText size={16} className="text-indigo-500" /> Resume (Optional)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                Upload your resume to personalize questions based on your actual experience.
                            </p>

                            {resumeFile ? (
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl">
                                    <FileText size={20} className="text-emerald-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{resumeFile.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                                    </div>
                                    <button onClick={() => { setResumeFile(null); setResumeAnalysis(null); }} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-2xl cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50/50">
                                    <Upload size={24} className="text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Drop PDF or click to upload</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">Max 4 MB</span>
                                    <input type="file" accept=".pdf" onChange={handleResumeChange} className="hidden" />
                                </label>
                            )}

                            {resumeAnalysis && (
                                <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-xl">
                                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{resumeAnalysis.improvedSummary || resumeAnalysis.summary || 'Resume analyzed successfully.'}</p>
                                </div>
                            )}
                        </div>

                        {/* Tips Card */}
                        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 p-8">
                            <h3 className="text-sm font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Sparkles size={16} /> Interview Tips
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    'Use the STAR method for behavioral questions',
                                    'Be specific with examples from projects',
                                    'Ask clarifying questions when needed',
                                    'Keep answers concise — 1-2 minutes each',
                                ].map((tip, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-indigo-700/80 dark:text-indigo-300/80 font-medium">
                                        <ChevronRight size={14} className="text-indigo-400 dark:text-indigo-500 shrink-0 mt-0.5" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHAT SCREEN — Premium theater-mode layout (matches MockInterview)
    // ═══════════════════════════════════════════════════════════════════
    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] flex flex-col lg:flex-row gap-6">

            {/* Main Chat Panel */}
            <motion.div
                layout
                className={`flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-full lg:w-3/4' : 'w-full'} min-h-[500px]`}
            >
                {/* Chat Header */}
                <div className="flex items-center justify-between p-5 md:px-8 md:py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white relative shrink-0">
                            <Bot size={24} />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse blur-[1px]"></span>
                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute"></span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">AI Interview Coach</h3>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                                {interviewSetup?.target_role || 'General'} • {interviewSetup?.interview_type === 'hr' ? 'HR' : 'Technical'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleBackToSetup} className="px-4 py-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl transition-colors text-sm">
                            <ArrowLeft size={16} /> <span className="hidden sm:inline">Setup</span>
                        </button>
                        <button onClick={handleFinishEarly} className="px-4 py-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm">
                            Finish
                        </button>
                        <button onClick={handleReset} className="px-4 py-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl transition-colors text-sm">
                            <RefreshCw size={16} /> <span className="hidden sm:inline">Reset</span>
                        </button>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="flex p-2 items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition-colors shrink-0"
                        >
                            {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-950/20">
                    {isPreparing && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
                                <Loader2 size={28} className="animate-spin text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200">Preparing your interviewer...</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Generating the first tailored question</p>
                            </div>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex gap-4 max-w-4xl mx-auto w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-sm mt-1 ${msg.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300' : 'bg-slate-800 dark:bg-slate-700 text-white dark:text-slate-100'}`}>
                                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                </div>
                                <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-5 py-4 rounded-[1.25rem] text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm'}`}>
                                        {msg.text}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 px-1 uppercase tracking-widest">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </motion.div>
                        ))}

                        {isTyping && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 max-w-4xl mx-auto w-full">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-slate-800 dark:bg-slate-700 text-white dark:text-slate-100 flex items-center justify-center shadow-sm mt-1">
                                    <Bot size={20} />
                                </div>
                                <div className="px-6 py-5 rounded-[1.25rem] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-sm flex items-center gap-1.5 shadow-sm h-14">
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2.5 h-2.5 bg-slate-300 dark:bg-slate-600 rounded-full"></motion.div>
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2.5 h-2.5 bg-slate-300 dark:bg-slate-600 rounded-full"></motion.div>
                                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2.5 h-2.5 bg-slate-300 dark:bg-slate-600 rounded-full"></motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={chatEndRef} className="h-4" />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-end gap-3 max-w-4xl mx-auto">

                        <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/50 rounded-2xl transition-all relative overflow-hidden flex items-end min-h-[60px]">
                            <textarea
                                className="w-full bg-transparent px-5 py-4 text-[15px] outline-none text-slate-800 dark:text-slate-100 resize-none flex-1"
                                placeholder="Type your response... (Enter to send)"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={Math.min(4, Math.max(1, input.split('\n').length))}
                                style={{ minHeight: '60px' }}
                                disabled={isPreparing}
                            />
                        </div>
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isTyping || isPreparing}
                            className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                                input.trim() && !isTyping ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            }`}
                        >
                            <Send size={24} className={input.trim() && !isTyping ? 'translate-x-0.5' : ''} />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Collapsible Sidebar */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col gap-6 shrink-0 lg:h-full lg:overflow-hidden w-full lg:w-1/4"
                    >
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 h-full flex flex-col overflow-y-auto w-full">
                            <div className="flex items-center gap-2 mb-6">
                                <Settings2 className="text-indigo-600" size={20} />
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Session Info</h3>
                            </div>

                            <div className="space-y-4 flex-1">
                                {[
                                    { label: 'Role', value: interviewSetup?.target_role || 'General' },
                                    { label: 'Domain', value: interviewSetup?.domain || 'General' },
                                    { label: 'Type', value: interviewSetup?.interview_type === 'hr' ? 'HR Interview' : 'Technical' },
                                    { label: 'Difficulty', value: difficultyOptions.find(d => d.id === interviewSetup?.difficulty)?.label || 'Fresher' },
                                    ...(interviewSetup?.company_name ? [{ label: 'Company', value: interviewSetup.company_name }] : []),
                                ].map((item, i) => (
                                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{item.label}</span>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1">{item.value}</span>
                                    </div>
                                ))}

                                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl mt-4">
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2 text-sm">
                                        <Sparkles size={14} /> Live Feedback
                                    </h4>
                                    {!liveFeedback ? (
                                        <p className="text-xs font-medium text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                                            Answer the current question to receive a detailed analysis of relevance, clarity, structure, depth, mistakes, and missing points.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-500">Answer score</span>
                                                    <span className="text-xl font-black text-indigo-900 dark:text-indigo-200">{liveFeedback.overall_score ?? 0}/100</span>
                                                </div>
                                                <p className="mt-2 text-xs font-semibold text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
                                                    {liveFeedback.answer_summary}
                                                </p>
                                            </div>

                                            {liveFeedback.scores && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {Object.entries(liveFeedback.scores).map(([label, score]) => (
                                                        <div key={label} className="rounded-xl bg-white/70 dark:bg-slate-900/50 p-2 border border-indigo-100 dark:border-indigo-900/30">
                                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                                                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{score}/100</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {[
                                                { label: 'What worked', items: liveFeedback.strengths, color: 'text-emerald-700 dark:text-emerald-300' },
                                                { label: 'Mistakes', items: liveFeedback.mistakes, color: 'text-rose-700 dark:text-rose-300' },
                                                { label: 'Missing points', items: liveFeedback.missing_points, color: 'text-amber-700 dark:text-amber-300' },
                                                { label: 'Better approach', items: liveFeedback.better_approach, color: 'text-indigo-800 dark:text-indigo-200' },
                                            ].map(section => section.items?.length > 0 && (
                                                <div key={section.label}>
                                                    <h5 className={`text-[11px] font-black uppercase tracking-widest ${section.color}`}>{section.label}</h5>
                                                    <ul className="mt-1.5 space-y-1.5">
                                                        {section.items.map((item, index) => (
                                                            <li key={`${section.label}-${index}`} className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                                                {index + 1}. {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}

                                            {liveFeedback.improved_answer && (
                                                <div className="rounded-xl bg-white/70 dark:bg-slate-900/50 p-3 border border-indigo-100 dark:border-indigo-900/30">
                                                    <h5 className="text-[11px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">Improved answer</h5>
                                                    <p className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                                        {liveFeedback.improved_answer}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default AiInterviewer;
