import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useGlobalUser } from '../context/useGlobalUser';
import { apiUrl, getApiConfigurationError } from '../api';
import BackButton from '../components/BackButton';
import {
    RefreshCw,
    ExternalLink,
    Building2,
    MessageSquare,
    CheckCircle2,
    ClipboardCopy,
    FileText,
    Mail,
    Lightbulb,
    Send,
    Edit3,
    Sparkles,
    UserCircle,
    Info,
    Check,
    PanelRightClose,
    PanelRightOpen
} from 'lucide-react';

const purposePresets = ['Job application', 'Interview follow-up', 'Leave request', 'Meeting request', 'Project update', 'Scholarship inquiry'];
const toneOptions = ['professional', 'friendly', 'confident', 'persuasive'];

const assistantActions = [
    { id: 'grammar_check', label: 'Grammar Check', icon: CheckCircle2 },
    { id: 'fix_email', label: 'Fix Email', icon: Sparkles },
    { id: 'suggest_improvements', label: 'Suggestions', icon: Lightbulb },
    { id: 'rewrite_email', label: 'Rewrite Entire Email', icon: RefreshCw },
];

const emailScoreParameters = [
    { key: 'grammar', label: 'Grammar' },
    { key: 'professional_tone', label: 'Professional tone' },
    { key: 'structure', label: 'Structure' },
    { key: 'clarity', label: 'Clarity' },
];

function createAiForm(user) {
    return { recipientName: '', recipientEmail: '', companyName: '', purpose: '', tone: 'professional', subjectHint: '', emailBrief: '', senderName: user?.name || '', senderEmail: user?.email || '' };
}
function createManualForm(user) {
    return { recipientName: '', recipientEmail: '', companyName: '', purpose: '', tone: 'professional', senderName: user?.name || '', senderEmail: user?.email || '', subject: '', body: '' };
}

function encodeMailtoValue(value) { return encodeURIComponent(value.replace(/\r?\n/g, '\r\n')); }
function buildPreview(text) { const normalized = text.replace(/\s+/g, ' ').trim(); return normalized ? normalized.slice(0, 160) : ''; }
function getManualDraftSignature(form) { return [form.subject.trim(), form.body.trim(), form.purpose.trim(), form.tone.trim()].join('::'); }
function getAssistantScoreLabel(score) { return score >= 90 ? 'Ready to send' : score >= 75 ? 'Strong draft' : score >= 60 ? 'Good foundation' : 'Needs revision'; }
async function copyText(value) { await navigator.clipboard.writeText(value); }

const InputWrap = ({ label, children, colSpan = 1 }) => (
    <label className={`flex flex-col gap-2 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
         <span className="text-sm font-bold text-slate-700">{label}</span>
         {children}
    </label>
);

const FormInput = ({ icon: Icon, ...props }) => (
    <div className="relative flex items-center">
        {Icon && <Icon size={18} className="absolute left-4 text-slate-400" />}
        <input className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 ${Icon ? 'pl-11' : ''}`} {...props} />
    </div>
);

export default function EmailGenerator() {
    const { user, token } = useAuth();
    const { refreshUserData } = useGlobalUser();
    const location = useLocation();
    const isManualMode = new URLSearchParams(location.search).get('mode') === 'manual';
    const assistantPanelRef = useRef(null);
    const [aiForm, setAiForm] = useState(() => createAiForm(user));
    const [manualForm, setManualForm] = useState(() => createManualForm(user));
    const [aiDraft, setAiDraft] = useState(null);
    const [assistantPrompt, setAssistantPrompt] = useState('');
    const [assistantResult, setAssistantResult] = useState(null);
    const [assistantReviewedSignature, setAssistantReviewedSignature] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAssisting, setIsAssisting] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [status, setStatus] = useState({ type: 'info', text: isManualMode ? 'Write the draft here and use AI to refine the current subject and body.' : 'Describe the email you want and generate an AI draft.' });

    useEffect(() => {
        setAiForm((prev) => {
            const next = { ...prev };
            let changed = false;
            if (!prev.senderName && user?.name) { next.senderName = user.name; changed = true; }
            if (!prev.senderEmail && user?.email) { next.senderEmail = user.email; changed = true; }
            return changed ? next : prev;
        });

        setManualForm((prev) => {
            const next = { ...prev };
            let changed = false;
            if (!prev.senderName && user?.name) { next.senderName = user.name; changed = true; }
            if (!prev.senderEmail && user?.email) { next.senderEmail = user.email; changed = true; }
            return changed ? next : prev;
        });
    }, [user]);

    useEffect(() => {
        setStatus({ type: 'info', text: isManualMode ? 'Write the draft here and use AI to refine the current subject and body.' : 'Describe the email you want and generate an AI draft.' });
    }, [isManualMode]);

    const updateAiForm = (field, value) => setAiForm((prev) => ({ ...prev, [field]: value }));
    const updateManualForm = (field, value) => setManualForm((prev) => ({ ...prev, [field]: value }));
    const updateAiDraft = (field, value) => setAiDraft((prev) => (prev ? { ...prev, [field]: value } : prev));

    const getCurrentComposeState = () => {
        if (isManualMode) {
            return {
                recipientEmail: manualForm.recipientEmail.trim(),
                recipientLabel: manualForm.recipientName.trim() || manualForm.companyName.trim() || manualForm.recipientEmail.trim() || 'your recipient',
                subject: manualForm.subject,
                body: manualForm.body,
                preview: buildPreview(manualForm.body),
                tone: manualForm.tone,
            };
        }
        return {
            recipientEmail: aiForm.recipientEmail.trim(),
            recipientLabel: aiForm.recipientName.trim() || aiForm.companyName.trim() || aiForm.recipientEmail.trim() || 'your recipient',
            subject: aiDraft?.subject || '',
            body: aiDraft?.body || '',
            preview: aiDraft?.preview || buildPreview(aiDraft?.body || ''),
            tone: aiForm.tone,
        };
    };

    const getMailtoLink = ({ recipientEmail, subject, body }) => {
        if (!subject.trim() && !body.trim()) return '';
        const params = [];
        if (subject.trim()) params.push(`subject=${encodeMailtoValue(subject.trim())}`);
        if (body.trim()) params.push(`body=${encodeMailtoValue(body.trim())}`);
        const query = params.join('&');
        return `mailto:${recipientEmail}${query ? `?${query}` : ''}`;
    };

    const handleGenerateAi = async (event) => {
        event?.preventDefault?.();
        if (!aiForm.emailBrief.trim() && !aiForm.purpose.trim()) {
            setStatus({ type: 'error', text: 'Please describe the email you want to generate.' });
            return;
        }
        setIsGenerating(true);
        setStatus({ type: 'info', text: 'Generating a concise draft for your mail app...' });

        try {
            const configurationError = getApiConfigurationError();
            if (configurationError) throw new Error(configurationError);
            const response = await fetch(apiUrl('/api/v1/email/generate'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    recipient_name: aiForm.recipientName,
                    recipient_email: aiForm.recipientEmail,
                    company_name: aiForm.companyName,
                    purpose: aiForm.purpose,
                    tone: aiForm.tone,
                    subject_hint: aiForm.subjectHint,
                    email_prompt: aiForm.emailBrief,
                    key_points: [], additional_context: '', call_to_action: '',
                    sender_name: aiForm.senderName,
                    sender_email: aiForm.senderEmail,
                }),
            });

            const rawResponse = await response.text();
            let result = {};
            if (rawResponse) {
                try { result = JSON.parse(rawResponse); } 
                catch { throw new Error(rawResponse.trim() || `Email generation failed with status ${response.status}`); }
            }
            if (!response.ok) throw new Error(result.detail || result.message || `Email generation failed with status ${response.status}`);

            setAiDraft({ subject: result.subject || '', body: result.body || '', preview: result.preview || '' });
            setStatus({ type: 'success', text: 'AI draft ready. Review it, tweak it, then open your mail app.' });
        } catch (error) {
            console.error('Email generation error:', error);
            setStatus({ type: 'error', text: error.message || 'Email generation failed.' });
        } finally { setIsGenerating(false); }
    };

    const handleAssistantAction = async (action) => {
        if (action === 'custom' && !assistantPrompt.trim()) { setStatus({ type: 'error', text: 'Enter a custom AI instruction first.' }); return; }
        if (!manualForm.body.trim() && !manualForm.purpose.trim()) { setStatus({ type: 'error', text: 'Write the email body or add a purpose before using the assistant.' }); return; }

        setIsAssisting(true);
        setStatus({ type: 'info', text: 'Reviewing the current draft across grammar, professional tone, structure, and clarity...' });

        try {
            const configurationError = getApiConfigurationError();
            if (configurationError) throw new Error(configurationError);
            const response = await fetch(apiUrl('/api/v1/email/assist'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    action,
                    recipient_name: manualForm.recipientName,
                    recipient_email: manualForm.recipientEmail,
                    company_name: manualForm.companyName,
                    purpose: manualForm.purpose,
                    tone: manualForm.tone,
                    sender_name: manualForm.senderName,
                    sender_email: manualForm.senderEmail,
                    subject: manualForm.subject,
                    body: manualForm.body,
                    instruction: action === 'custom' ? assistantPrompt : '',
                }),
            });

            const rawResponse = await response.text();
            let result = {};
            if (rawResponse) {
                try { result = JSON.parse(rawResponse); } 
                catch { throw new Error(rawResponse.trim() || `Email assistant failed with status ${response.status}`); }
            }
            if (!response.ok) throw new Error(result.detail || result.message || `Email assistant failed with status ${response.status}`);

            setAssistantResult({
                actionLabel: result.action_label || 'AI Assist',
                subject: result.subject || '',
                body: result.body || '',
                preview: result.preview || '',
                qualityScore: Number.isFinite(result.quality_score) ? result.quality_score : 0,
                reportSummary: result.report_summary || '',
                scoreBreakdown: result.score_breakdown && typeof result.score_breakdown === 'object' ? result.score_breakdown : {},
                suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
                issues: Array.isArray(result.issues) ? result.issues : [],
                assistantNote: result.assistant_note || '',
            });
            setAssistantReviewedSignature(currentManualDraftSignature);
            setStatus({ type: 'success', text: `${result.action_label || 'AI assist'} completed. Current draft score: ${Number.isFinite(result.quality_score) ? result.quality_score : 0}%.` });
        } catch (error) {
            console.error('Email assistant error:', error);
            setStatus({ type: 'error', text: error.message || 'Email assistant failed.' });
        } finally { setIsAssisting(false); }
    };

    const applyAssistantDraft = () => {
        if (!assistantResult) return;
        setManualForm((prev) => ({ ...prev, subject: assistantResult.subject, body: assistantResult.body }));
        setStatus({ type: 'success', text: 'AI version applied to your editable draft.' });
    };

    const handleCopyCurrentDraft = async () => {
        const current = getCurrentComposeState();
        if (!current.subject.trim() && !current.body.trim()) { setStatus({ type: 'error', text: 'There is no draft to copy yet.' }); return; }
        try {
            await copyText(`Subject: ${current.subject}\n\n${current.body}`);
            localStorage.setItem('nlm-has-drafted-email', 'true');
            refreshUserData();
            setStatus({ type: 'success', text: 'Current draft copied to clipboard.' });
        } catch (error) {
            console.error('Clipboard error:', error);
            setStatus({ type: 'error', text: 'Clipboard access failed in this browser.' });
        }
    };

    const handleCopyAssistantDraft = async () => {
        if (!assistantResult?.subject && !assistantResult?.body) return;
        try {
            await copyText(`Subject: ${assistantResult.subject}\n\n${assistantResult.body}`);
            setStatus({ type: 'success', text: 'AI version copied to clipboard.' });
        } catch (error) {
            console.error('Clipboard error:', error);
            setStatus({ type: 'error', text: 'Clipboard access failed in this browser.' });
        }
    };

    const handleOpenMailApp = () => {
        const current = getCurrentComposeState();
        const mailtoLink = getMailtoLink(current);
        if (!mailtoLink) { setStatus({ type: 'error', text: 'Add a subject or body before opening the mail app.' }); return; }
        window.location.href = mailtoLink;
        localStorage.setItem('nlm-has-drafted-email', 'true');
        refreshUserData();
        setStatus({ type: 'info', text: 'Opening your default mail app with the current draft prefilled.' });
    };

    const scrollToAssistantPanel = () => { assistantPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

    const currentComposeState = getCurrentComposeState();
    const currentManualDraftSignature = getManualDraftSignature(manualForm);
    const isAssistantReviewCurrent = Boolean(assistantResult) && assistantReviewedSignature === currentManualDraftSignature;


    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-4">
            <BackButton />
            <div className="w-full min-h-[calc(100vh-120px)] lg:h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6 relative">
            <div className="flex items-center justify-between lg:hidden mb-2">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="flex ml-auto p-2.5 items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors shrink-0 shadow-sm"
                >
                    {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                    <span className="ml-2 text-sm font-bold">{isManualMode ? 'Toggle AI Copilot' : 'Toggle Draft Panel'}</span>
                </button>
            </div>
            
            <div className="hidden lg:flex items-center justify-between absolute top-[110px] right-8 z-50">
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="flex p-2.5 items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors shrink-0 shadow-sm shadow-indigo-500/10"
                >
                    {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:overflow-hidden overflow-visible">
                {/* COMPOSER FORM (Left) */}
                <motion.div 
                    layout
                    className={`${isSidebarOpen ? (isManualMode ? 'w-full lg:w-[60%]' : 'w-full lg:w-[65%]') : 'w-full'} bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6 md:p-8 flex flex-col gap-6 overflow-y-auto transition-all`}
                >
                    <div className="flex items-center justify-between">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={status.text}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className={`flex flex-1 items-center gap-3 p-3 rounded-xl border font-medium shadow-sm w-full ${
                                    status.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}
                            >
                                <Info size={18} className="shrink-0" />
                                <span className="text-sm">{status.text}</span>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex gap-4 items-start pb-6 border-b border-slate-100 dark:border-slate-800 mt-2">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                            {isManualMode ? <Edit3 size={24} /> : <Sparkles size={24} />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{isManualMode ? 'Manual Email Composer' : 'AI Direct Drafter'}</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">{isManualMode ? 'Draft manually and let the AI assist and refine.' : 'Provide natural language context and let the AI draft it end-to-end.'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Presets Row */}
                         <div className="md:col-span-2 flex flex-wrap gap-2">
                             {purposePresets.map((preset) => {
                                 const isActive = isManualMode ? manualForm.purpose === preset : aiForm.purpose === preset;
                                 return (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => isManualMode ? updateManualForm('purpose', preset) : updateAiForm('purpose', preset)}
                                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${isActive ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
                                    >
                                        {preset}
                                    </button>
                                 );
                             })}
                         </div>

                         <InputWrap label="Recipient Name"><FormInput value={isManualMode ? manualForm.recipientName : aiForm.recipientName} onChange={(e) => isManualMode ? updateManualForm('recipientName', e.target.value) : updateAiForm('recipientName', e.target.value)} placeholder="e.g. John Doe" /></InputWrap>
                         <InputWrap label="Recipient Email"><FormInput value={isManualMode ? manualForm.recipientEmail : aiForm.recipientEmail} onChange={(e) => isManualMode ? updateManualForm('recipientEmail', e.target.value) : updateAiForm('recipientEmail', e.target.value)} placeholder="contact@example.com" type="email" /></InputWrap>
                         <InputWrap label="Company Name"><FormInput icon={Building2} value={isManualMode ? manualForm.companyName : aiForm.companyName} onChange={(e) => isManualMode ? updateManualForm('companyName', e.target.value) : updateAiForm('companyName', e.target.value)} placeholder="Acme Inc." /></InputWrap>
                         <InputWrap label="Sender Name"><FormInput icon={UserCircle} value={isManualMode ? manualForm.senderName : aiForm.senderName} onChange={(e) => isManualMode ? updateManualForm('senderName', e.target.value) : updateAiForm('senderName', e.target.value)} placeholder="Your Name" /></InputWrap>
                         
                         <InputWrap label="Preferred Tone" colSpan={2}>
                             <div className="flex flex-wrap gap-2">
                                {toneOptions.map((tone) => {
                                    const isActive = isManualMode ? manualForm.tone === tone : aiForm.tone === tone;
                                    return (
                                        <button
                                            key={tone}
                                            type="button"
                                            onClick={() => isManualMode ? updateManualForm('tone', tone) : updateAiForm('tone', tone)}
                                            className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-bold border transition-all capitalize ${isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            {tone}
                                        </button>
                                    );
                                })}
                             </div>
                         </InputWrap>

                         {!isManualMode ? (
                             <>
                                <InputWrap label="Subject Guidance" colSpan={2}><FormInput value={aiForm.subjectHint} onChange={(e) => updateAiForm('subjectHint', e.target.value)} placeholder="e.g. Application for Frontend Role" /></InputWrap>
                                <InputWrap label="Draft Request / Brief" colSpan={2}>
                                    <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 resize-y min-h-[160px]" placeholder="Explain what you want the email to say..." value={aiForm.emailBrief} onChange={(e) => updateAiForm('emailBrief', e.target.value)} />
                                </InputWrap>
                                <div className="md:col-span-2 pt-4">
                                    <button onClick={handleGenerateAi} disabled={isGenerating} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                        {isGenerating ? <><RefreshCw className="animate-spin" size={20} /> Generating Details...</> : <><Sparkles size={20} /> Generate AI Draft</>}
                                    </button>
                                </div>
                             </>
                         ) : (
                             <>
                                <InputWrap label="Direct Subject" colSpan={2}><FormInput value={manualForm.subject} onChange={(e) => updateManualForm('subject', e.target.value)} placeholder="Type exact subject..." /></InputWrap>
                                <InputWrap label="Direct Body Composition" colSpan={2}>
                                    <textarea className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-100 resize-y min-h-[300px]" placeholder="Start typing your email..." value={manualForm.body} onChange={(e) => updateManualForm('body', e.target.value)} />
                                </InputWrap>
                             </>
                         )}
                    </div>
                </motion.div>

                {/* PREVIEW & AI ASSISTANT (Right) */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`flex flex-col gap-6 shrink-0 lg:h-full lg:overflow-hidden w-full ${isManualMode ? 'lg:w-[40%]' : 'lg:w-[35%]'}`}
                        >
                    
                    {!isManualMode && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6 md:p-8 flex flex-col h-full">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6"><Send size={18} className="text-emerald-500" /> Dispatch Center</h3>
                            {aiDraft ? (
                                <div className="flex flex-col gap-4 flex-1">
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold shrink-0">To: {currentComposeState.recipientLabel}</span>
                                    </div>
                                    <InputWrap label="Generated Subject"><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800" value={aiDraft.subject} onChange={(e) => updateAiDraft('subject', e.target.value)} /></InputWrap>
                                    <InputWrap label="Generated Body"><textarea className="w-full flex-1 min-h-[300px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-800 outline-none" value={aiDraft.body} onChange={(e) => updateAiDraft('body', e.target.value)} /></InputWrap>
                                    
                                    <div className="grid grid-cols-2 gap-3 mt-auto pt-6">
                                        <button onClick={handleOpenMailApp} className="col-span-2 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg transition-colors"><ExternalLink size={18} /> Open Mail Client</button>
                                        <button onClick={handleCopyCurrentDraft} className="py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex justify-center items-center gap-2 transition-colors"><ClipboardCopy size={18} /> Copy All</button>
                                        <button onClick={handleGenerateAi} className="py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex justify-center items-center gap-2 transition-colors"><RefreshCw size={18} /> Re-roll</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-6">
                                    <Mail size={48} className="mb-4 text-slate-400" />
                                    <p className="font-semibold text-slate-500">Awaiting your parameters.<br/>Hit Generate AI Draft to see results here.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {isManualMode && (
                        <div ref={assistantPanelRef} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6 md:p-8 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><MessageSquare size={18} className="text-violet-500" /> Copilot Assist</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${manualForm.body.trim() ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {manualForm.body.trim() ? 'Target Locked' : 'Awaiting Output'}
                                </span>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {assistantActions.map((act) => (
                                        <button key={act.id} disabled={isAssisting} onClick={() => handleAssistantAction(act.id)} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all disabled:opacity-50 text-slate-700 font-semibold text-sm">
                                            <act.icon size={16} /> {act.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative mt-2">
                                    <textarea placeholder="Custom command... e.g. Make it sound extremely confident" value={assistantPrompt} onChange={e => setAssistantPrompt(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none resize-none h-20" />
                                    <button disabled={isAssisting} onClick={() => handleAssistantAction('custom')} className="absolute bottom-3 right-3 text-white bg-indigo-600 hover:bg-indigo-700 p-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                                        {isAssisting ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                    </button>
                                </div>

                                {assistantResult && (
                                    <AnimatePresence>
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-4 mt-4 border-t border-slate-100 pt-6">
                                            <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-2xl text-white shadow-xl">
                                                <div className="flex flex-col">
                                                    <span className="text-3xl font-black">{assistantResult.qualityScore}%</span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Draft Score</span>
                                                </div>
                                                <p className="text-xs text-slate-300 flex-1 leading-relaxed border-l border-slate-700 pl-4">{assistantResult.reportSummary}</p>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase">Suggested Subject</span>
                                                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-semibold border border-emerald-100">{assistantResult.subject}</div>
                                                
                                                <span className="text-xs font-bold text-slate-400 uppercase mt-2">Suggested Body</span>
                                                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl whitespace-pre-wrap text-sm border border-emerald-100 max-h-64 overflow-y-auto">{assistantResult.body}</div>
                                            </div>

                                            <button onClick={applyAssistantDraft} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg transition-colors mt-2">
                                                <Check size={20} /> Copy Over to Draft
                                            </button>
                                        </motion.div>
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
            </div>
        </div>
    </div>
);
}
