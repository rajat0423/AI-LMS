import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    Edit3,
    Eye,
    EyeOff,
    FileQuestion,
    FileText,
    GraduationCap,
    Layers,
    ListChecks,
    Plus,
    RefreshCw,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { apiUrl } from '../api';
import { useAuth } from '../context/useAuth';

const inputClass = 'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 outline-none transition-all';
const buttonBase = 'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

const BLOOMS_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

function parsePlacementRelevance(raw) {
    const parts = (raw || '').split('|').map((p) => p.trim());
    const bloom = BLOOMS_LEVELS.includes(parts[0]) ? parts[0] : 'Remember';
    const co = parts[1] || 'CO1';
    const concepts = parts[2] ? parts[2].split(',').map((c) => c.trim()).filter(Boolean) : [];
    return { bloom, co, concepts };
}

function assemblePlacementRelevance(bloom, co, concepts) {
    const conceptStr = (concepts || []).join(', ');
    if (!co && !conceptStr) return bloom;
    if (!conceptStr) return `${bloom} | ${co}`;
    return `${bloom} | ${co} | ${conceptStr}`;
}

const emptyQuestion = () => ({
    question_id: null,
    text: '',
    order: 1,
    difficulty_level: 'Medium',
    placement_relevance: 'Remember | CO1 | ',
    bloom: 'Remember',
    co: 'CO1',
    concepts: [],
    explanation: '',
    options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
    ],
});

function Notice({ notice, clearNotice }) {
    if (!notice) return null;
    const isError = notice.type === 'error';
    return (
        <div className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl ${isError ? 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400' : 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400'}`}>
            {isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <div className="flex-1">
                <p className="text-sm font-bold">{notice.title}</p>
                {notice.body && <p className="mt-0.5 text-xs opacity-80">{notice.body}</p>}
            </div>
            <button onClick={clearNotice} className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5">
                <X size={14} />
            </button>
        </div>
    );
}

function StatCard({ icon, label, value, color = 'indigo' }) {
    const IconComponent = icon;
    const colors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 ring-indigo-100 dark:ring-indigo-900/50',
        violet: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 ring-violet-100 dark:ring-violet-900/50',
        emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 ring-emerald-100 dark:ring-emerald-900/50',
        amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 ring-amber-100 dark:ring-amber-900/50',
    };
    return (
        <div className="flex items-center gap-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${colors[color] || colors.indigo}`}>
                <IconComponent size={21} />
            </div>
            <div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value ?? 0}</p>
                <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
            </div>
        </div>
    );
}

function Modal({ title, children, onClose, wide = false }) {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
            <div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{title}</h3>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
            {children}
        </label>
    );
}

function ConceptTagInput({ concepts, onChange }) {
    const [inputValue, setInputValue] = useState('');

    const addTags = (raw) => {
        const tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
        onChange([...new Set([...concepts, ...tags])]);
        setInputValue('');
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (inputValue.trim()) addTags(inputValue);
        } else if (event.key === ',') {
            event.preventDefault();
            if (inputValue.trim()) addTags(inputValue);
        } else if (event.key === 'Backspace' && !inputValue && concepts.length > 0) {
            onChange(concepts.slice(0, -1));
        }
    };

    const removeTag = (index) => onChange(concepts.filter((_, i) => i !== index));

    return (
        <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-900/50 transition-all cursor-text">
            {concepts.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border dark:border-indigo-900/20">
                    {tag}
                    <button type="button" onClick={() => removeTag(i)} className="rounded text-indigo-400 dark:text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300">
                        <X size={10} />
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (inputValue.trim()) addTags(inputValue); }}
                className="flex-1 min-w-[140px] border-none bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none"
                placeholder={concepts.length === 0 ? 'Type a concept, press Enter or comma…' : 'Add more…'}
            />
        </div>
    );
}

function QuestionForm({ value, onChange, onSubmit, onCancel, isSaving }) {
    const updateOption = (index, patch) => {
        onChange({
            ...value,
            options: value.options.map((option, optionIndex) => (
                optionIndex === index ? { ...option, ...patch } : option
            )),
        });
    };

    const markCorrect = (index) => {
        onChange({
            ...value,
            options: value.options.map((option, optionIndex) => ({
                ...option,
                is_correct: optionIndex === index,
            })),
        });
    };

    const addOption = () => {
        if (value.options.length >= 6) return;
        onChange({ ...value, options: [...value.options, { text: '', is_correct: false }] });
    };

    const removeOption = (index) => {
        const nextOptions = value.options.filter((_option, optionIndex) => optionIndex !== index);
        if (!nextOptions.some((option) => option.is_correct) && nextOptions[0]) {
            nextOptions[0].is_correct = true;
        }
        onChange({ ...value, options: nextOptions });
    };

    const updateMeta = (patch) => {
        const bloom = patch.bloom ?? value.bloom ?? 'Remember';
        const co = patch.co ?? value.co ?? 'CO1';
        const concepts = patch.concepts ?? value.concepts ?? [];
        onChange({
            ...value,
            ...patch,
            placement_relevance: assemblePlacementRelevance(bloom, co, concepts),
        });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Question">
                <textarea
                    required
                    rows={3}
                    value={value.text}
                    onChange={(event) => onChange({ ...value, text: event.target.value })}
                    className={`${inputClass} resize-none`}
                    placeholder="Write the MCQ question"
                />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Order">
                    <input
                        type="number"
                        min="1"
                        value={value.order}
                        onChange={(event) => onChange({ ...value, order: Number(event.target.value) })}
                        className={inputClass}
                    />
                </Field>
                <Field label="Difficulty">
                    <select
                        value={value.difficulty_level}
                        onChange={(event) => onChange({ ...value, difficulty_level: event.target.value })}
                        className={inputClass}
                    >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                    </select>
                </Field>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Concepts tested &amp; placement tags</p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Bloom's Level">
                        <select
                            value={value.bloom || 'Remember'}
                            onChange={(e) => updateMeta({ bloom: e.target.value })}
                            className={inputClass}
                        >
                            {BLOOMS_LEVELS.map((level) => (
                                <option key={level}>{level}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Course Outcome">
                        <input
                            value={value.co || ''}
                            onChange={(e) => updateMeta({ co: e.target.value })}
                            className={inputClass}
                            placeholder="e.g. CO1"
                        />
                    </Field>
                </div>
                <div>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Concept Tags</span>
                    <ConceptTagInput
                        concepts={value.concepts || []}
                        onChange={(concepts) => updateMeta({ concepts })}
                    />
                    <p className="mt-1.5 text-[10px] text-slate-400">
                        Press <kbd className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-600">Enter</kbd> or <kbd className="rounded bg-slate-200 px-1 py-0.5 font-mono text-slate-600">,</kbd> to add a tag — click the × on a tag to remove it.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Options</p>
                    <button type="button" onClick={addOption} disabled={value.options.length >= 6} className={`${buttonBase} px-3 py-1.5 text-indigo-600 hover:bg-indigo-50`}>
                        <Plus size={14} /> Option
                    </button>
                </div>
                <div className="space-y-2">
                    {value.options.map((option, index) => (
                        <div key={index} className="grid gap-2 rounded-lg border border-slate-100 bg-white p-2 sm:grid-cols-[auto_1fr_auto]">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <input
                                    type="radio"
                                    name="correct-option"
                                    checked={option.is_correct}
                                    onChange={() => markCorrect(index)}
                                />
                                Correct
                            </label>
                            <input
                                required
                                value={option.text}
                                onChange={(event) => updateOption(index, { text: event.target.value })}
                                className={inputClass}
                                placeholder={`Option ${index + 1}`}
                            />
                            <button type="button" onClick={() => removeOption(index)} disabled={value.options.length <= 2} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <Field label="Explanation shown after answer">
                <textarea
                    rows={3}
                    value={value.explanation || ''}
                    onChange={(event) => onChange({ ...value, explanation: event.target.value })}
                    className={`${inputClass} resize-none`}
                    placeholder="Explain why the correct answer is best"
                />
            </Field>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={onCancel} className={`${buttonBase} bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200`}>
                    Cancel
                </button>
                <button type="submit" disabled={isSaving} className={`${buttonBase} bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700`}>
                    <Save size={16} /> Save Question
                </button>
            </div>
        </form>
    );
}


function AdminPanel() {
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [modules, setModules] = useState([]);
    const [overview, setOverview] = useState(null);
    const [userCount, setUserCount] = useState({ total: 0, active: 0, inactive: 0 });
    const [users, setUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [editor, setEditor] = useState(null);
    const [selectedModuleId, setSelectedModuleId] = useState(null);
    const [selectedLessonId, setSelectedLessonId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notice, setNotice] = useState(null);
    const [moduleModal, setModuleModal] = useState(null);
    const [lessonModal, setLessonModal] = useState(null);
    const [lessonModalParentId, setLessonModalParentId] = useState(null);
    const [questionDraft, setQuestionDraft] = useState(null);
    const [isSavingQuestion, setIsSavingQuestion] = useState(false);
    const [expandedUnits, setExpandedUnits] = useState({});

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }), [token]);

    const notify = useCallback((title, body = '', type = 'success') => {
        setNotice({ title, body, type });
        window.setTimeout(() => setNotice(null), 3500);
    }, []);

    const requestJson = useCallback(async (path, options = {}) => {
        const response = await fetch(apiUrl(path), {
            ...options,
            headers: { ...headers, ...(options.headers || {}) },
        });
        const text = await response.text();
        const payload = text ? JSON.parse(text) : null;
        if (!response.ok) {
            throw new Error(payload?.error?.message || payload?.detail || 'Request failed');
        }
        return payload;
    }, [headers]);

    const fetchOverview = useCallback(async () => {
        if (!token || user?.role !== 'admin') return;
        const [contentPayload, usersPayload] = await Promise.all([
            requestJson('/api/v1/admin/content/overview'),
            requestJson('/api/v1/admin/users/count'),
        ]);
        setOverview(contentPayload);
        setUserCount(usersPayload);
    }, [requestJson, token, user?.role]);

    const fetchModules = useCallback(async () => {
        if (!token || user?.role !== 'admin') return;
        const payload = await requestJson('/api/v1/modules');
        setModules(Array.isArray(payload) ? payload : []);
    }, [requestJson, token, user?.role]);

    const fetchUsers = useCallback(async () => {
        if (!token || user?.role !== 'admin') return;
        const payload = await requestJson('/api/v1/admin/users/');
        setUsers(Array.isArray(payload) ? payload : []);
    }, [requestJson, token, user?.role]);

    const fetchEditor = useCallback(async (moduleId) => {
        if (!moduleId) return;
        setIsLoading(true);
        try {
            const payload = await requestJson(`/api/v1/admin/content/modules/${moduleId}/editor`);
            setEditor(payload);
            setSelectedLessonId((current) => {
                if (current && payload.lessons.some((lesson) => lesson.lesson_id === current)) return current;
                return payload.lessons.find((lesson) => !lesson.is_unit_header)?.lesson_id || payload.lessons[0]?.lesson_id || null;
            });
        } catch (error) {
            notify('Could not load module editor', error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [notify, requestJson]);

    useEffect(() => {
        if (user?.role !== 'admin') return;
        fetchOverview().catch((error) => notify('Could not load overview', error.message, 'error'));
        fetchModules().catch((error) => notify('Could not load modules', error.message, 'error'));
    }, [fetchModules, fetchOverview, notify, user?.role]);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers().catch((error) => notify('Could not load users', error.message, 'error'));
        }
    }, [activeTab, fetchUsers, notify]);

    useEffect(() => {
        if (!selectedModuleId && modules[0]) {
            setSelectedModuleId(modules[0].module_id);
        }
    }, [modules, selectedModuleId]);

    useEffect(() => {
        if (selectedModuleId && activeTab === 'content') {
            fetchEditor(selectedModuleId);
        }
    }, [activeTab, fetchEditor, selectedModuleId]);

    useEffect(() => {
        if (!selectedLessonId || !editor?.lessons) return;
        const lesson = editor.lessons.find((l) => l.lesson_id === selectedLessonId);
        if (!lesson) return;
        if (lesson.is_unit_header) {
            setExpandedUnits((prev) => ({ ...prev, [lesson.lesson_id]: true }));
        } else {
            const expectedUnitOrder = Math.floor(lesson.order / 10);
            const unit = editor.lessons.find((l) => l.is_unit_header && l.order === expectedUnitOrder);
            if (unit) {
                setExpandedUnits((prev) => ({ ...prev, [unit.lesson_id]: true }));
            }
        }
    }, [selectedLessonId, editor?.lessons]);

    const modulesByYear = useMemo(() => modules.reduce((acc, moduleItem) => {
        const key = moduleItem.year || 1;
        acc[key] = [...(acc[key] || []), moduleItem];
        return acc;
    }, {}), [modules]);

    const filteredUsers = useMemo(() => {
        const query = userSearch.trim().toLowerCase();
        if (!query) return users;
        return users.filter((item) => `${item.first_name} ${item.last_name} ${item.email}`.toLowerCase().includes(query));
    }, [userSearch, users]);

    const selectedLesson = useMemo(() => (
        editor?.lessons?.find((lesson) => lesson.lesson_id === selectedLessonId) || null
    ), [editor, selectedLessonId]);

    const parentUnitTitle = useMemo(() => (
        lessonModalParentId ? editor?.lessons?.find((lesson) => lesson.lesson_id === lessonModalParentId)?.title || '' : ''
    ), [editor, lessonModalParentId]);

    const groupedUnits = useMemo(() => {
        if (!editor?.lessons) return [];
        const lessons = [...editor.lessons].sort((a, b) => a.order - b.order);
        const unitHeaders = lessons.filter((l) => l.is_unit_header);
        const topics = lessons.filter((l) => !l.is_unit_header);

        const grouped = [];
        const groupedTopicIds = new Set();

        unitHeaders.forEach((unit) => {
            const expectedPrefix = unit.order * 10;
            const unitTopics = topics.filter((topic) => {
                const match = topic.order >= expectedPrefix && topic.order < expectedPrefix + 10;
                if (match) {
                    groupedTopicIds.add(topic.lesson_id);
                }
                return match;
            });
            grouped.push({
                unit,
                topics: unitTopics,
            });
        });

        const orphanedTopics = topics.filter((topic) => !groupedTopicIds.has(topic.lesson_id));
        if (orphanedTopics.length > 0) {
            grouped.push({
                unit: {
                    lesson_id: 'orphaned',
                    title: 'Orphaned / Unassigned Topics',
                    is_unit_header: true,
                    order: -999,
                    content: 'Topics that do not fall under any unit order range.',
                },
                topics: orphanedTopics,
            });
        }

        return grouped;
    }, [editor?.lessons]);

    const getDefaultTopicOrderAfterUnit = useCallback((unitLessonId) => {
        const lessons = [...(editor?.lessons || [])].sort((a, b) => a.order - b.order);
        const unit = lessons.find((lesson) => lesson.lesson_id === unitLessonId);
        if (!unit) {
            return (lessons[lessons.length - 1]?.order || 0) + 1;
        }

        const expectedPrefix = unit.order * 10;
        let nextOrder = expectedPrefix + 1;

        const unitTopics = lessons.filter(
            (lesson) => !lesson.is_unit_header && lesson.order >= expectedPrefix && lesson.order < expectedPrefix + 10
        );
        if (unitTopics.length > 0) {
            nextOrder = Math.max(...unitTopics.map((t) => t.order)) + 1;
        }

        return nextOrder;
    }, [editor?.lessons]);

    const handleAddTopicUnderUnit = (unitLesson) => {
        setLessonModal({ title: '', content: '', order: getDefaultTopicOrderAfterUnit(unitLesson.lesson_id) });
        setLessonModalParentId(unitLesson.lesson_id);
        setSelectedLessonId(unitLesson.lesson_id);
    };

    const saveModule = async (event) => {
        event.preventDefault();
        const payload = {
            title: moduleModal.title,
            description: moduleModal.description,
            year: Number(moduleModal.year),
            order: Number(moduleModal.order),
            is_premium: Boolean(moduleModal.is_premium),
        };
        try {
            if (moduleModal.module_id) {
                await requestJson(`/api/v1/modules/${moduleModal.module_id}`, { method: 'PUT', body: JSON.stringify(payload) });
                notify('Module updated');
            } else {
                await requestJson('/api/v1/modules', { method: 'POST', body: JSON.stringify(payload) });
                notify('Module created');
            }
            setModuleModal(null);
            await fetchModules();
            await fetchOverview();
            if (selectedModuleId) await fetchEditor(selectedModuleId);
        } catch (error) {
            notify('Could not save module', error.message, 'error');
        }
    };

    const deleteModule = async (moduleItem) => {
        if (!window.confirm(`Delete "${moduleItem.title}" and all content inside it?`)) return;
        try {
            await fetch(apiUrl(`/api/v1/modules/${moduleItem.module_id}`), { method: 'DELETE', headers });
            notify('Module deleted');
            setEditor(null);
            setSelectedModuleId(null);
            await fetchModules();
            await fetchOverview();
        } catch (error) {
            notify('Could not delete module', error.message, 'error');
        }
    };

    const saveLesson = async (event) => {
        event.preventDefault();
        
        let title = lessonModal.title;
        if (lessonModal.is_unit_header && !title.toLowerCase().startsWith("unit ")) {
            title = `UNIT ${lessonModal.order}: ${title}`;
        }

        const payload = {
            title: title,
            content: lessonModal.content,
            order: Number(lessonModal.order),
        };
        try {
            if (lessonModal.lesson_id) {
                await requestJson(`/api/v1/lessons/${lessonModal.lesson_id}`, { method: 'PUT', body: JSON.stringify(payload) });
                notify(lessonModal.is_unit_header ? 'Unit updated' : 'Topic updated');
            } else {
                await requestJson('/api/v1/lessons', {
                    method: 'POST',
                    body: JSON.stringify({ ...payload, module_id: selectedModuleId }),
                });
                notify(lessonModal.is_unit_header ? 'Unit created' : 'Topic created');
            }
            setLessonModal(null);
            setLessonModalParentId(null);
            await fetchEditor(selectedModuleId);
            await fetchOverview();
        } catch (error) {
            notify('Could not save topic', error.message, 'error');
        }
    };

    const deleteLesson = async (lesson) => {
        if (!window.confirm(`Delete "${lesson.title}" and its quiz content?`)) return;
        try {
            await fetch(apiUrl(`/api/v1/lessons/${lesson.lesson_id}`), { method: 'DELETE', headers });
            notify('Topic deleted');
            setSelectedLessonId(null);
            await fetchEditor(selectedModuleId);
            await fetchOverview();
        } catch (error) {
            notify('Could not delete topic', error.message, 'error');
        }
    };

    const ensureQuiz = async (lesson) => {
        if (lesson.quiz) return lesson.quiz;
        const quiz = await requestJson(`/api/v1/admin/content/lessons/${lesson.lesson_id}/quiz`, {
            method: 'POST',
            body: JSON.stringify({ title: `Quiz: ${lesson.title}`, description: 'Topic quiz' }),
        });
        await fetchEditor(selectedModuleId);
        notify('Quiz shell created');
        return quiz;
    };

    const openQuestionForm = async (question = null) => {
        if (!selectedLesson) return;
        try {
            await ensureQuiz(selectedLesson);
            const questionCount = selectedLesson.quiz?.questions?.length || 0;
            if (question) {
                const { bloom, co, concepts } = parsePlacementRelevance(question.placement_relevance || '');
                setQuestionDraft({
                    ...question,
                    options: question.options.map((option) => ({ text: option.text, is_correct: option.is_correct })),
                    explanation: question.explanation || '',
                    bloom,
                    co,
                    concepts,
                });
            } else {
                setQuestionDraft({ ...emptyQuestion(), order: questionCount + 1 });
            }
        } catch (error) {
            notify('Could not prepare question editor', error.message, 'error');
        }
    };


    const saveQuestion = async (event) => {
        event.preventDefault();
        if (!selectedLesson) return;
        setIsSavingQuestion(true);
        try {
            const freshQuiz = selectedLesson.quiz || await ensureQuiz(selectedLesson);
            const payload = {
                text: questionDraft.text,
                order: Number(questionDraft.order),
                difficulty_level: questionDraft.difficulty_level,
                placement_relevance: questionDraft.placement_relevance,
                explanation: questionDraft.explanation,
                options: questionDraft.options.map((option) => ({
                    text: option.text,
                    is_correct: Boolean(option.is_correct),
                })),
            };
            if (questionDraft.question_id) {
                await requestJson(`/api/v1/admin/content/questions/${questionDraft.question_id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                notify('Question updated');
            } else {
                await requestJson(`/api/v1/admin/content/quizzes/${freshQuiz.quiz_id}/questions`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                notify('Question added');
            }
            setQuestionDraft(null);
            await fetchEditor(selectedModuleId);
            await fetchOverview();
        } catch (error) {
            notify('Could not save question', error.message, 'error');
        } finally {
            setIsSavingQuestion(false);
        }
    };

    const deleteQuestion = async (question) => {
        if (!window.confirm('Delete this question?')) return;
        try {
            await fetch(apiUrl(`/api/v1/admin/content/questions/${question.question_id}`), { method: 'DELETE', headers });
            notify('Question deleted');
            await fetchEditor(selectedModuleId);
            await fetchOverview();
        } catch (error) {
            notify('Could not delete question', error.message, 'error');
        }
    };

    const toggleUserActive = async (userItem) => {
        try {
            const payload = await requestJson(`/api/v1/admin/users/${userItem.user_id}/toggle-active`, { method: 'PATCH' });
            notify(payload.message || 'User access updated');
            await fetchUsers();
            await fetchOverview();
        } catch (error) {
            notify('Could not update user', error.message, 'error');
        }
    };

    if (user?.role !== 'admin') {
        return (
            <div className="mx-auto max-w-md px-4 py-24 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                    <ShieldCheck size={28} className="text-red-400" />
                </div>
                <h1 className="mb-2 text-2xl font-extrabold text-slate-900">Access Denied</h1>
                <p className="mb-6 text-sm leading-relaxed text-slate-500">Only administrators can access the Admin Panel.</p>
                <a href="/dashboard" className={`${buttonBase} bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700`}>Go to Dashboard</a>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'content', label: 'Content', icon: Layers },
        { id: 'users', label: 'Users', icon: Users },
    ];

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Admin workspace</p>
                    <h1 className="mt-1 text-3xl font-extrabold text-slate-950 dark:text-slate-50">Content and user management</h1>
                </div>
                <button onClick={() => { fetchOverview(); fetchModules(); if (selectedModuleId) fetchEditor(selectedModuleId); }} className={`${buttonBase} bg-slate-900 dark:bg-slate-800 px-4 py-2.5 text-white dark:text-slate-200 hover:bg-slate-800 dark:hover:bg-slate-700 border dark:border-slate-700`}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${buttonBase} px-4 py-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800'}`}
                        >
                            <Icon size={16} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={Users} label="Users" value={userCount.total} color="indigo" />
                        <StatCard icon={BookOpen} label="Modules" value={overview?.total_modules} color="violet" />
                        <StatCard icon={FileText} label="Topics" value={overview?.total_lessons} color="emerald" />
                        <StatCard icon={FileQuestion} label="Questions" value={overview?.total_questions} color="amber" />
                    </div>
                    <div className="mt-6 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Quick actions</h2>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button onClick={() => setModuleModal({ title: '', description: '', year: 1, order: modules.length + 1, is_premium: false })} className={`${buttonBase} bg-indigo-600 px-4 py-2.5 text-white hover:bg-indigo-700`}>
                                <Plus size={16} /> New Module
                            </button>
                            <button onClick={() => setActiveTab('content')} className={`${buttonBase} bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700`}>
                                <ListChecks size={16} /> Edit Questions
                            </button>
                            <button onClick={() => setActiveTab('users')} className={`${buttonBase} bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700`}>
                                <Users size={16} /> Manage Users
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === 'content' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[360px_1fr]">
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Modules</h2>
                            <button onClick={() => setModuleModal({ title: '', description: '', year: 1, order: modules.length + 1, is_premium: false })} className={`${buttonBase} bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700`}>
                                <Plus size={15} /> New
                            </button>
                        </div>
                        <div className="space-y-4">
                            {Object.keys(modulesByYear).sort((a, b) => Number(a) - Number(b)).map((year) => (
                                <div key={year}>
                                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        <GraduationCap size={14} /> Year {year}
                                    </p>
                                    <div className="space-y-2">
                                        {modulesByYear[year].map((moduleItem) => (
                                            <button
                                                key={moduleItem.module_id}
                                                onClick={() => { setSelectedModuleId(moduleItem.module_id); setActiveTab('content'); }}
                                                className={`w-full rounded-xl border p-3 text-left transition ${selectedModuleId === moduleItem.module_id ? 'border-indigo-200 dark:border-indigo-900/35 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{moduleItem.title}</span>
                                                    <ChevronDown size={15} className="text-slate-400 dark:text-slate-500" />
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{moduleItem.lesson_count || 0} topics</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-5">
                        {isLoading && (
                            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-500">
                                <RefreshCw className="mx-auto mb-3 animate-spin text-indigo-500" />
                                Loading editor...
                            </div>
                        )}
                        {!isLoading && editor && (
                            <>
                                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Selected module</p>
                                            <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100">{editor.module.title}</h2>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-450">{editor.module.description || 'No description'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setModuleModal(editor.module)} className={`${buttonBase} bg-slate-100 dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700`}>
                                                <Edit3 size={15} /> Edit
                                            </button>
                                            <button onClick={() => deleteModule(editor.module)} className={`${buttonBase} bg-red-50 dark:bg-red-950/20 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30`}>
                                                <Trash2 size={15} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
                                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Topics and unit headers</h3>
                                            <button onClick={() => { setLessonModal({ title: '', content: '', order: (editor.lessons?.length || 0) + 1, is_unit_header: false }); setLessonModalParentId(null); }} className={`${buttonBase} bg-violet-600 px-3 py-2 text-white hover:bg-violet-700`}>
                                                <Plus size={15} /> Unit / Topic
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {groupedUnits.map(({ unit, topics }) => {
                                                const isExpanded = !!expandedUnits[unit.lesson_id];
                                                const isUnitSelected = selectedLessonId === unit.lesson_id;
                                                return (
                                                    <div key={unit.lesson_id} className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                                        <div
                                                            onClick={() => {
                                                                setSelectedLessonId(unit.lesson_id);
                                                                setExpandedUnits((prev) => ({ ...prev, [unit.lesson_id]: !prev[unit.lesson_id] }));
                                                            }}
                                                            className={`flex w-full items-center justify-between gap-2 border-b p-3 text-left transition cursor-pointer ${isUnitSelected ? 'border-violet-200 dark:border-violet-900/30 bg-violet-50/70 dark:bg-violet-950/20' : 'border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'}`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <motion.div
                                                                    animate={{ rotate: isExpanded ? 90 : 0 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="text-slate-400 dark:text-slate-500 shrink-0"
                                                                >
                                                                    <ChevronDown size={16} />
                                                                </motion.div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{unit.title}</p>
                                                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-450">
                                                                        {topics.length} topic{topics.length !== 1 ? 's' : ''}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1 shrink-0" onClick={(event) => event.stopPropagation()}>
                                                                {unit.lesson_id !== 'orphaned' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddTopicUnderUnit(unit)}
                                                                        className={`${buttonBase} rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border dark:border-indigo-900/20`}
                                                                    >
                                                                        <Plus size={12} /> Topic
                                                                    </button>
                                                                )}
                                                                {unit.lesson_id !== 'orphaned' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setLessonModal(unit); setLessonModalParentId(null); }}
                                                                        className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                )}
                                                                {unit.lesson_id !== 'orphaned' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => deleteLesson(unit)}
                                                                        className="rounded-lg p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <AnimatePresence initial={false}>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="bg-slate-50/30 dark:bg-slate-900/30"
                                                                >
                                                                    <div className="p-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
                                                                        {topics.length === 0 ? (
                                                                            <div className="p-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                                                                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">No topics in this unit yet.</p>
                                                                                <button
                                                                                    onClick={() => handleAddTopicUnderUnit(unit)}
                                                                                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                                                                >
                                                                                    <Plus size={12} /> Add first topic
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            topics.map((topic) => {
                                                                                const isTopicSelected = selectedLessonId === topic.lesson_id;
                                                                                return (
                                                                                    <div
                                                                                        key={topic.lesson_id}
                                                                                        onClick={() => setSelectedLessonId(topic.lesson_id)}
                                                                                        className={`group relative flex items-center justify-between gap-2 rounded-lg border p-2.5 text-left transition cursor-pointer pl-6 ${isTopicSelected
                                                                                                ? 'border-violet-200 dark:border-violet-900 bg-violet-50/80 dark:bg-violet-950/20 shadow-sm'
                                                                                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
                                                                                            }`}
                                                                                    >
                                                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />

                                                                                        <div className="min-w-0 flex-1">
                                                                                            <p className={`text-xs font-semibold ${isTopicSelected ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-700 dark:text-slate-400'} truncate`}>
                                                                                                {topic.title}
                                                                                            </p>
                                                                                            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                                                                                {topic.quiz?.question_count || 0} questions
                                                                                            </p>
                                                                                        </div>

                                                                                        <div className="flex items-center gap-0.5 shrink-0" onClick={(event) => event.stopPropagation()}>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => { setLessonModal(topic); setLessonModalParentId(null); }}
                                                                                                className="rounded-md p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
                                                                                            >
                                                                                                <Edit3 size={13} />
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => deleteLesson(topic)}
                                                                                                className="rounded-md p-1 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                                                                                            >
                                                                                                <Trash2 size={13} />
                                                                                            </button>
                                                                                            {topic.quiz ? (
                                                                                                <CheckCircle2 size={14} className="text-emerald-500 ml-1" />
                                                                                            ) : (
                                                                                                <FileQuestion size={14} className="text-slate-300 dark:text-slate-600 ml-1" />
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                                        {selectedLesson ? (
                                            <>
                                                <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{selectedLesson.is_unit_header ? 'Unit header' : 'Topic'}</p>
                                                        <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-100">{selectedLesson.title}</h3>
                                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedLesson.content}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button onClick={() => setLessonModal(selectedLesson)} className={`${buttonBase} bg-slate-100 dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700`}>
                                                            <Edit3 size={15} /> Edit
                                                        </button>
                                                        <button onClick={() => deleteLesson(selectedLesson)} className={`${buttonBase} bg-red-50 dark:bg-red-950/20 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30`}>
                                                            <Trash2 size={15} /> Delete
                                                        </button>
                                                    </div>
                                                </div>

                                                {!selectedLesson.is_unit_header && (
                                                    <>
                                                        <div className="mb-4 flex items-center justify-between">
                                                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">MCQ questions</h4>
                                                            <button onClick={() => openQuestionForm()} className={`${buttonBase} bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700`}>
                                                                <Plus size={15} /> Question
                                                            </button>
                                                        </div>
                                                        {!selectedLesson.quiz && (
                                                            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6 text-center">
                                                                <FileQuestion className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No quiz exists for this topic yet.</p>
                                                                <button onClick={() => ensureQuiz(selectedLesson)} className={`${buttonBase} mt-3 bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700`}>
                                                                    <Plus size={15} /> Create Quiz
                                                                </button>
                                                            </div>
                                                        )}
                                                        {selectedLesson.quiz?.questions?.length === 0 && (
                                                            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6 text-center text-sm text-slate-500 dark:text-slate-400">This quiz has no questions yet.</div>
                                                        )}
                                                        <div className="space-y-3">
                                                            {selectedLesson.quiz?.questions?.map((question) => (
                                                                <div key={question.question_id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-4">
                                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                        <div>
                                                                            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Q{question.order} - {question.difficulty_level}</p>
                                                                            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{question.text}</p>
                                                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-450">{question.placement_relevance}</p>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button onClick={() => openQuestionForm(question)} className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                                                                <Edit3 size={16} />
                                                                            </button>
                                                                            <button onClick={() => deleteQuestion(question)} className="rounded-lg p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                                        {question.options.map((option) => (
                                                                            <div key={option.option_id} className={`rounded-lg border px-3 py-2 text-sm ${option.is_correct ? 'border-emerald-200 dark:border-emerald-900/35 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400'}`}>
                                                                                {option.text}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <div className="py-16 text-center text-slate-400 dark:text-slate-500">Select a topic to edit content and questions.</div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            )}

            {activeTab === 'users' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">User management</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{userCount.active || 0} active, {userCount.inactive || 0} blocked</p>
                        </div>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} className={`${inputClass} pl-9 sm:w-80`} placeholder="Search users" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-left text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Access</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((item) => {
                                    const name = [item.first_name, item.last_name].filter(Boolean).join(' ') || 'Unnamed';
                                    return (
                                        <tr key={item.user_id} className="border-b border-slate-50 dark:border-slate-800/50">
                                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{name}</td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.email}</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300 border dark:border-indigo-900/20">{item.role_name || 'student'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${item.is_active ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'}`}>
                                                    {item.is_active ? <Eye size={13} /> : <EyeOff size={13} />} {item.is_active ? 'Active' : 'Blocked'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => toggleUserActive(item)} className={`${buttonBase} px-3 py-1.5 ${item.is_active ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'}`}>
                                                    {item.is_active ? 'Block' : 'Grant'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {moduleModal && (
                <Modal title={moduleModal.module_id ? 'Edit Module' : 'Create Module'} onClose={() => setModuleModal(null)}>
                    <form onSubmit={saveModule} className="space-y-4">
                        <Field label="Title"><input required value={moduleModal.title || ''} onChange={(event) => setModuleModal({ ...moduleModal, title: event.target.value })} className={inputClass} /></Field>
                        <Field label="Description"><textarea value={moduleModal.description || ''} onChange={(event) => setModuleModal({ ...moduleModal, description: event.target.value })} className={`${inputClass} resize-none`} rows={3} /></Field>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="Year"><input type="number" min="1" max="4" value={moduleModal.year || 1} onChange={(event) => setModuleModal({ ...moduleModal, year: Number(event.target.value) })} className={inputClass} /></Field>
                            <Field label="Order"><input type="number" min="1" value={moduleModal.order || 1} onChange={(event) => setModuleModal({ ...moduleModal, order: Number(event.target.value) })} className={inputClass} /></Field>
                            <label className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                                <input type="checkbox" checked={Boolean(moduleModal.is_premium)} onChange={(event) => setModuleModal({ ...moduleModal, is_premium: event.target.checked })} />
                                Premium
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                            <button type="button" onClick={() => setModuleModal(null)} className={`${buttonBase} bg-slate-100 dark:bg-slate-850 px-4 py-2 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800`}>Cancel</button>
                            <button type="submit" className={`${buttonBase} bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700`}><Save size={16} /> Save</button>
                        </div>
                    </form>
                </Modal>
            )}

            {lessonModal && (
                <Modal
                    title={
                        lessonModal.lesson_id
                            ? (lessonModal.is_unit_header ? 'Edit Unit Header' : 'Edit Topic')
                            : lessonModalParentId
                            ? `Add Topic to ${parentUnitTitle}`
                            : lessonModal.is_unit_header
                            ? 'Create Unit Header'
                            : 'Create Topic'
                    }
                    onClose={() => {
                        setLessonModal(null);
                        setLessonModalParentId(null);
                    }}
                >
                    <form onSubmit={saveLesson} className="space-y-4">
                        {!lessonModal.lesson_id && !lessonModalParentId && (
                            <div className="flex gap-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-2.5 border dark:border-slate-800">
                                <label className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-350 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="lesson-type"
                                        checked={!lessonModal.is_unit_header}
                                        onChange={() => {
                                            const nextOrder = (editor.lessons?.length || 0) + 1;
                                            setLessonModal({ ...lessonModal, is_unit_header: false, order: nextOrder });
                                        }}
                                    />
                                    Topic
                                </label>
                                <label className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-350 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="lesson-type"
                                        checked={!!lessonModal.is_unit_header}
                                        onChange={() => {
                                            const nextUnitOrder = (editor.lessons?.filter((l) => l.is_unit_header).length || 0) + 1;
                                            setLessonModal({ ...lessonModal, is_unit_header: true, order: nextUnitOrder });
                                        }}
                                    />
                                    Unit Header
                                </label>
                            </div>
                        )}
                        <Field label="Title">
                            <input
                                required
                                value={lessonModal.title || ''}
                                onChange={(event) => setLessonModal({ ...lessonModal, title: event.target.value })}
                                className={inputClass}
                                placeholder={lessonModal.is_unit_header ? "e.g. Unit 5: Advanced Placement Prep" : "e.g. Resume Building Checklist"}
                            />
                        </Field>
                        <Field label={lessonModal.is_unit_header ? "Unit Description" : "Content"}>
                            <textarea
                                required
                                value={lessonModal.content || ''}
                                onChange={(event) => setLessonModal({ ...lessonModal, content: event.target.value })}
                                className={`${inputClass} resize-none`}
                                rows={5}
                                placeholder={lessonModal.is_unit_header ? "Describe the scope and objectives of this unit." : "Topic details and learning material."}
                            />
                        </Field>
                        <Field label="Order">
                            <input
                                type="number"
                                min="1"
                                value={lessonModal.order || 1}
                                onChange={(event) => setLessonModal({ ...lessonModal, order: Number(event.target.value) })}
                                className={inputClass}
                            />
                        </Field>
                        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setLessonModal(null);
                                    setLessonModalParentId(null);
                                }}
                                className={`${buttonBase} bg-slate-100 dark:bg-slate-850 px-4 py-2 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800`}
                            >
                                Cancel
                            </button>
                            <button type="submit" className={`${buttonBase} bg-violet-600 px-4 py-2 text-white hover:bg-violet-700`}>
                                <Save size={16} /> Save
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {questionDraft && (
                <Modal title={questionDraft.question_id ? 'Edit Question' : 'Add Question'} onClose={() => setQuestionDraft(null)} wide>
                    <QuestionForm
                        value={questionDraft}
                        onChange={setQuestionDraft}
                        onSubmit={saveQuestion}
                        onCancel={() => setQuestionDraft(null)}
                        isSaving={isSavingQuestion}
                    />
                </Modal>
            )}

            <Notice notice={notice} clearNotice={() => setNotice(null)} />
        </div>
    );
}

export default AdminPanel;
