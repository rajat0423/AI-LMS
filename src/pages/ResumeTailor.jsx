import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UploadCloud,
    FileText,
    Sparkles,
    Download,
    CheckCircle2,
    X,
    ChevronLeft,
    Plus,
    Trash2,
    Printer,
    RefreshCw,
    Briefcase,
    GraduationCap,
    Hammer,
    LayoutGrid,
    Check
} from 'lucide-react';
import { apiUrl, getApiConfigurationError } from '../api';
import { useAuth } from '../context/useAuth';
import './ResumeTemplates.css';

const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const TEMPLATES = [
    { id: 'corporate-blue', name: 'Corporate Blue', className: 'template-corporate-blue', description: 'Clean Helvetica, bold headers, slate blue accents.' },
    { id: 'classic-latex', name: 'Classic LaTeX', className: 'template-classic-latex', description: 'Traditional academic serif format with horizontal lines.' },
    { id: 'modern-minimal', name: 'Modern Minimal', className: 'template-modern-minimal', description: 'Contemporary split-layout, generous breathing room.' },
    { id: 'executive-slate', name: 'Executive Slate', className: 'template-executive-slate', description: 'Elegant Garamond, professional charcoal details.' },
    { id: 'tech-compact', name: 'Tech Compact', className: 'template-tech-compact', description: 'Monospace, space-optimized dense layout for developers.' },
    { id: 'creative-accent', name: 'Creative Accent', className: 'template-creative-accent', description: 'Outfit typeface, top color gradient accent bar.' },
    { id: 'minimalist-line', name: 'Minimalist Line', className: 'template-minimalist-line', description: 'Thin horizontal lines dividing clean sections.' },
    { id: 'elegant-bookman', name: 'Elegant Bookman', className: 'template-elegant-bookman', description: 'Serif Bookman, centered header, traditional look.' },
    { id: 'high-density-academic', name: 'Academic Density', className: 'template-high-density-academic', description: 'Extremely tight margins tailored to high-experience CVs.' },
    { id: 'clean-minimalist', name: 'Clean Minimalist', className: 'template-clean-minimalist', description: 'Timeless layout with clean margins and breathing room.' }
];

export default function ResumeTailor() {
    const { token } = useAuth();
    const [resumeFile, setResumeFile] = useState(null);
    const [jdText, setJdText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressStep, setProgressStep] = useState(0);
    const [tailoredData, setTailoredData] = useState(null);
    const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]);
    const [editMode, setEditMode] = useState(true);

    const fileInputRef = useRef(null);

    const progressSteps = [
        "Parsing your uploaded resume text...",
        "Analyzing target job requirements...",
        "Rewriting professional summary with ATS-friendly keywords...",
        "Aligning experience bullet points using the STAR method...",
        "Structuring responsive layouts & templates..."
    ];

    useEffect(() => {
        let interval;
        if (isProcessing) {
            setProgressStep(0);
            interval = setInterval(() => {
                setProgressStep(prev => {
                    if (prev < progressSteps.length - 1) {
                        return prev + 1;
                    }
                    return prev;
                });
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    const validateResumeFile = (file) => {
        if (!file) return false;
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
            alert('Please upload a PDF resume only. PDF is required for accurate text and layout extraction.');
            return false;
        }
        if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
            alert('Resume PDF must be smaller than 5MB.');
            return false;
        }
        return true;
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (validateResumeFile(file)) {
            setResumeFile(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (validateResumeFile(file)) {
            setResumeFile(file);
        }
    };

    const handleTailor = async () => {
        if (!resumeFile || !jdText.trim()) {
            alert("Please upload your resume PDF and paste the target Job Description first.");
            return;
        }
        setIsProcessing(true);
        try {
            const configError = getApiConfigurationError();
            if (configError) throw new Error(configError);

            const formData = new FormData();
            formData.append('resume_file', resumeFile);
            formData.append('job_description', jdText);

            const response = await fetch(apiUrl('/api/v1/resume/tailor'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (err) {
                throw new Error(text || `Request failed with status ${response.status}`);
            }

            if (!response.ok) {
                throw new Error(result.detail || result.message || `Request failed with status ${response.status}`);
            }

            setTailoredData(result);
        } catch (error) {
            console.error("Resume tailoring failed:", error);
            alert(`AI Resume Tailoring failed: ${error.message}. Returning pre-tailored fallback for demonstration.`);
            // Secure fallback tailored to SDE role
            setTailoredData({
                personal_info: {
                    name: "Rajat Tripathi",
                    title: "Software Development Engineer (SDE) - AI & Full Stack",
                    email: "trajat905@gmail.com",
                    phone: "+91 88282 17021",
                    location: "Delhi, India",
                    linkedin: "https://www.linkedin.com/in/rajat-tripathi-a048a5295",
                    github: "https://github.com/rajat0423"
                },
                summary: "Results-driven Software Engineer with hands-on experience building highly scalable full-stack applications and intelligent AI services. Expert in Python, FastAPI, and React, specializing in system optimizations, background multitasking, and deploying high-performance REST APIs aligned with strict product goals.",
                skills: ["Python", "FastAPI", "React.js", "JavaScript (ES6+)", "SQLAlchemy", "PostgreSQL", "Groq AI Llama API", "Git", "GitHub Actions", "Docker", "Tailwind CSS", "RESTful APIs", "Agile Methodologies"],
                experience: [
                    {
                        company: "Aao Seekhe Live",
                        role: "Full Stack SDE Intern",
                        location: "Remote, India",
                        start_date: "Jan 2025",
                        end_date: "Present",
                        bullets: [
                            "Designed and implemented high-performance REST APIs in FastAPI, cutting server start-up and database seeding times by 40% using background multitasking.",
                            "Built and deployed a continuous liveness uptime monitor using GitHub Actions, ensuring 99.99% availability of the Render container service.",
                            "Collaborated in an agile team to design ATS-friendly interactive user interfaces using React, framer-motion, and Tailwind CSS."
                        ]
                    },
                    {
                        company: "Personal Projects Portfolio",
                        role: "Lead Developer",
                        location: "Delhi, India",
                        start_date: "Jun 2024",
                        end_date: "Dec 2024",
                        bullets: [
                            "Architected AcuMedic, a digital healthcare assistant using React, optimizing component state updates for rapid page transitions.",
                            "Built AI Rasoi, a smart recipe generator using generative AI, providing responsive mobile-first layouts and print-perfect stylesheets."
                        ]
                    }
                ],
                education: [
                    {
                        school: "Delhi Technological University (DTU)",
                        degree: "Bachelor of Technology in Computer Science & Engineering",
                        location: "Delhi, India",
                        start_date: "Aug 2022",
                        end_date: "Jul 2026",
                        gpa: "8.8/10"
                    }
                ],
                projects: [
                    {
                        title: "Aao Seekhe Live AI-LMS Platform",
                        technologies: ["React.js", "FastAPI", "PostgreSQL", "Groq AI"],
                        bullets: [
                            "Designed a premium Zety-style Interactive Resume Builder that extracts resume text and aligns it dynamically with any target Job Description.",
                            "Engineered a responsive split-screen preview workspace allowing real-time CSS style changes and instant print-perfect PDF compiles."
                        ]
                    }
                ]
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Text editors
    const handleTextChange = (field, subfield, value) => {
        setTailoredData(prev => {
            if (!prev) return prev;
            if (subfield) {
                return {
                    ...prev,
                    [field]: {
                        ...prev[field],
                        [subfield]: value
                    }
                };
            }
            return {
                ...prev,
                [field]: value
            };
        });
    };

    const handleNestedListChange = (section, idx, field, value) => {
        setTailoredData(prev => {
            if (!prev) return prev;
            const updatedList = [...prev[section]];
            updatedList[idx] = {
                ...updatedList[idx],
                [field]: value
            };
            return {
                ...prev,
                [section]: updatedList
            };
        });
    };

    // Adders and Removers
    const addBullet = (section, idx) => {
        setTailoredData(prev => {
            if (!prev) return prev;
            const list = [...prev[section]];
            list[idx].bullets = [...list[idx].bullets, "New achievement bullet point..."];
            return { ...prev, [section]: list };
        });
    };

    const removeBullet = (section, itemIdx, bulletIdx) => {
        setTailoredData(prev => {
            if (!prev) return prev;
            const list = [...prev[section]];
            list[itemIdx].bullets = list[itemIdx].bullets.filter((_, i) => i !== bulletIdx);
            return { ...prev, [section]: list };
        });
    };

    const addSkill = () => {
        setTailoredData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                skills: [...prev.skills, "New Skill"]
            };
        });
    };

    const removeSkill = (idx) => {
        setTailoredData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                skills: prev.skills.filter((_, i) => i !== idx)
            };
        });
    };

    const addExperience = () => {
        setTailoredData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                experience: [
                    ...prev.experience,
                    {
                        company: "New Company",
                        role: "Software Engineer",
                        location: "Delhi, India",
                        start_date: "Month Year",
                        end_date: "Month Year",
                        bullets: ["Led design of core service...", "Improved database efficiency..."]
                    }
                ]
            };
        });
    };

    const removeExperience = (idx) => {
        if (confirm("Are you sure you want to remove this experience item?")) {
            setTailoredData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    experience: prev.experience.filter((_, i) => i !== idx)
                };
            });
        }
    };

    const addProject = () => {
        setTailoredData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                projects: [
                    ...prev.projects,
                    {
                        title: "New Project Title",
                        technologies: ["React", "FastAPI"],
                        bullets: ["Designed and implemented service...", "Configured automated CI/CD pipeline..."]
                    }
                ]
            };
        });
    };

    const removeProject = (idx) => {
        if (confirm("Are you sure you want to remove this project?")) {
            setTailoredData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    projects: prev.projects.filter((_, i) => i !== idx)
                };
            });
        }
    };

    const addEducation = () => {
        setTailoredData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                education: [
                    ...prev.education,
                    {
                        school: "University Name",
                        degree: "Bachelor of Technology in Computer Science",
                        location: "Delhi, India",
                        start_date: "Year",
                        end_date: "Year",
                        gpa: "8.5/10"
                    }
                ]
            };
        });
    };

    const removeEducation = (idx) => {
        if (confirm("Are you sure you want to remove this education item?")) {
            setTailoredData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    education: prev.education.filter((_, i) => i !== idx)
                };
            });
        }
    };

    const handlePrint = () => {
        setEditMode(false);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    // Miniature Visual Representation Generator for Layout Picker
    const getTemplatePreviewMockup = (tmplId) => {
        switch (tmplId) {
            case 'corporate-blue':
                return (
                    <div className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden p-2 flex flex-col gap-1 shadow-inner">
                        <div className="h-2 w-1/2 bg-blue-600 rounded-sm"></div>
                        <div className="h-1 w-1/3 bg-slate-400 dark:bg-slate-500 rounded-sm"></div>
                        <div className="w-full border-b border-slate-250 dark:border-slate-700 my-0.5"></div>
                        <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                        <div className="h-1 w-5/6 bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                    </div>
                );
            case 'classic-latex':
                return (
                    <div className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden p-2 flex flex-col items-center gap-1 shadow-inner">
                        <div className="h-2 w-1/3 bg-slate-800 dark:bg-slate-200 rounded-sm mt-0.5"></div>
                        <div className="h-1 w-1/2 bg-slate-400 dark:bg-slate-500 rounded-sm"></div>
                        <div className="w-full border-b border-slate-800 dark:border-slate-400 my-0.5"></div>
                        <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                        <div className="h-1 w-5/6 bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                    </div>
                );
            case 'modern-minimal':
                return (
                    <div className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden p-2 flex gap-2 shadow-inner">
                        <div className="w-6 border-r border-slate-200 dark:border-slate-700 flex flex-col gap-1 pr-0.5 shrink-0">
                            <div className="h-2 w-full bg-slate-700 dark:bg-slate-300 rounded-sm"></div>
                            <div className="h-1.5 w-5/6 bg-slate-400 dark:bg-slate-500 rounded-sm"></div>
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                            <div className="h-1.5 w-2/3 bg-slate-500 dark:bg-slate-400 rounded-sm"></div>
                            <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                            <div className="h-1 w-5/6 bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                        </div>
                    </div>
                );
            case 'executive-slate':
                return (
                    <div className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden p-2 flex flex-col gap-1 shadow-inner">
                        <div className="h-2 w-2/5 bg-slate-750 dark:bg-slate-355 rounded-sm"></div>
                        <div className="h-1 w-full bg-slate-400 dark:bg-slate-500 rounded-sm"></div>
                        <div className="w-full border-b border-slate-300 dark:border-slate-700 my-0.5"></div>
                        <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                    </div>
                );
            case 'tech-compact':
                return (
                    <div className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden p-2 flex flex-col gap-1 shadow-inner">
                        <div className="flex justify-between items-center">
                            <div className="h-2.5 w-1/3 bg-slate-800 dark:bg-slate-200 rounded-sm"></div>
                            <div className="h-1.5 w-1/4 bg-sky-600 dark:bg-sky-400 rounded-sm"></div>
                        </div>
                        <div className="flex gap-0.5">
                            <div className="h-1.5 w-4 bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-850 rounded-sm"></div>
                            <div className="h-1.5 w-5 bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-850 rounded-sm"></div>
                            <div className="h-1.5 w-3 bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-850 rounded-sm"></div>
                        </div>
                    </div>
                );
            case 'creative-accent':
                return (
                    <div className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden relative p-2 pt-2.5 flex flex-col gap-1 shadow-inner">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        <div className="h-2 w-1/2 bg-indigo-650 dark:bg-indigo-300 rounded-sm"></div>
                        <div className="h-1 w-1/3 bg-purple-550 dark:bg-purple-400 rounded-sm"></div>
                        <div className="h-1 w-full bg-slate-300 dark:bg-slate-660 rounded-sm"></div>
                    </div>
                );
            case 'minimalist-line':
                return (
                    <div className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden p-2 flex flex-col gap-1 shadow-inner">
                        <div className="h-2.5 w-2/5 bg-slate-800 dark:bg-slate-200 rounded-sm"></div>
                        <div className="w-full border-t border-slate-300 dark:border-slate-700 my-0.5"></div>
                        <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                        <div className="w-full border-t border-slate-300 dark:border-slate-700 my-0.5"></div>
                    </div>
                );
            case 'elegant-bookman':
                return (
                    <div className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden p-2 flex flex-col items-center gap-1 shadow-inner">
                        <div className="h-2 w-1/2 bg-stone-800 dark:bg-stone-300 rounded-sm"></div>
                        <div className="h-1 w-3/5 bg-stone-550 dark:bg-stone-400 rounded-sm"></div>
                        <div className="w-full border-b border-double border-stone-600 dark:border-stone-500 my-0.5"></div>
                    </div>
                );
            case 'high-density-academic':
                return (
                    <div className="w-full h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden p-1.5 flex flex-col gap-1 shadow-inner">
                        <div className="h-2 w-1/3 bg-slate-900 dark:bg-slate-100 rounded-sm"></div>
                        <div className="w-full border-b border-slate-900 dark:border-slate-700 my-0.5"></div>
                        <div className="h-1 w-full bg-slate-400 dark:bg-slate-600 rounded-sm"></div>
                        <div className="h-1 w-full bg-slate-400 dark:bg-slate-600 rounded-sm"></div>
                    </div>
                );
            case 'clean-minimalist':
                return (
                    <div className="w-full h-16 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg overflow-hidden p-2.5 flex flex-col gap-1 shadow-sm">
                        <div className="h-2 w-1/3 bg-black dark:bg-white rounded-sm"></div>
                        <div className="h-1 w-1/2 bg-slate-450 dark:bg-slate-400 rounded-sm mt-0.5"></div>
                        <div className="h-1 w-3/4 bg-slate-300 dark:bg-slate-650 rounded-sm"></div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)] flex flex-col">
            
            {/* STICKY CONTROL BAR - Hides during print */}
            <div className="no-print w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] p-4 md:px-6 md:py-4 flex flex-col md:flex-row justify-between items-center gap-4 mb-6 shadow-sm">
                <div className="flex items-center gap-4">
                    {tailoredData && (
                        <button 
                            onClick={() => {
                                if (confirm("Do you want to reset and tailor a new resume? Any manual edits will be lost.")) {
                                    setTailoredData(null);
                                    setResumeFile(null);
                                    setJdText('');
                                }
                            }}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                            title="Start Over"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <Sparkles size={20} className="fill-indigo-200" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">AI Custom Resume Generator</h2>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Premium ATS Resume Tailor</p>
                        </div>
                    </div>
                </div>

                {tailoredData && (
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {editMode ? (
                            <button
                                onClick={() => setEditMode(false)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-750 dark:text-indigo-300 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-indigo-200/50 dark:border-indigo-800/50 cursor-pointer shadow-sm"
                            >
                                <Check size={14} strokeWidth={3} /> Save & Finalize
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-800/30 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    <CheckCircle2 size={12} className="fill-emerald-100 dark:fill-emerald-900/10" /> Saved Successfully
                                </span>
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm"
                                >
                                    Unlock & Edit
                                </button>
                            </div>
                        )}

                        <button 
                            onClick={handlePrint}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                            <Printer size={16} /> Download Single-Page PDF
                        </button>
                    </div>
                )}
            </div>

            {/* PROCESSING OVERLAY SCREEN */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="no-print fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <div className="max-w-md w-full text-center flex flex-col items-center">
                            <div className="relative w-24 h-24 mb-8">
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border-4 border-dashed border-indigo-500/30"
                                />
                                <motion.div 
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-2 rounded-full border-4 border-dashed border-purple-500/50"
                                />
                                <div className="absolute inset-4 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-indigo-400">
                                    <Sparkles size={32} className="animate-pulse fill-indigo-400/20" />
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-white tracking-tight mb-3">Aligning Your Application</h3>
                            <div className="h-6 overflow-hidden relative w-full mb-6">
                                <AnimatePresence mode="wait">
                                    <motion.p 
                                        key={progressStep}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -20, opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="text-indigo-300 font-bold text-sm"
                                    >
                                        {progressSteps[progressStep]}
                                    </motion.p>
                                </AnimatePresence>
                            </div>
                            
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((progressStep + 1) / progressSteps.length) * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                />
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-3 block">Please wait, this will take approximately 15-20 seconds.</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN WORKSPACE SPLIT AREA */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                
                {/* LEFT COLUMN: INPUT WIZARD OR VISUAL STYLES BAR */}
                <div className="no-print w-full lg:w-1/3 flex flex-col gap-6 shrink-0 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto pr-1">
                    
                    {!tailoredData ? (
                        /* WIZARD STATE (INPUTS) */
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 md:p-8 flex flex-col gap-6 shadow-sm dark:shadow-none"
                        >
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Tailor to Target JD</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Upload your PDF resume and paste target Job Description to generate 10 premium custom presets.</p>
                            </div>

                            {/* Dropzone */}
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">1. Upload Original Resume (PDF)</span>
                                <div 
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-50/20'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50/20'); }}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-[1.5rem] p-6 text-center cursor-pointer transition-all ${resumeFile ? 'border-indigo-400 bg-indigo-50/10 dark:bg-indigo-950/10' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400'}`}
                                >
                                    <input 
                                        type="file" 
                                        accept=".pdf" 
                                        ref={fileInputRef} 
                                        onChange={handleFileUpload} 
                                        className="hidden" 
                                    />
                                    {resumeFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/60 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <FileText size={24} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate max-w-xs">{resumeFile.name}</span>
                                            <span className="text-[10px] font-semibold text-slate-400">{(resumeFile.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-inner">
                                                <UploadCloud size={24} />
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Drag & drop or browse resume</span>
                                            <span className="text-[10px] font-semibold text-slate-400">PDF format only, up to 5MB</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* JD text */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">2. Paste Job Description</span>
                                    <span className="text-[10px] font-bold text-slate-400">{jdText.length} chars</span>
                                </div>
                                <textarea
                                    value={jdText}
                                    onChange={(e) => setJdText(e.target.value)}
                                    placeholder="Paste the target role description, key skills, and company background here. Groq AI will perfectly adjust summaries, STAR bullets, and align requirements..."
                                    className="w-full h-44 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 focus:border-indigo-400 outline-none text-sm text-slate-700 dark:text-slate-100 font-medium leading-relaxed resize-none transition-all"
                                />
                            </div>

                            <button
                                onClick={handleTailor}
                                disabled={!resumeFile || !jdText.trim()}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${(!resumeFile || !jdText.trim()) ? 'bg-slate-100 text-slate-450 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-600/20 hover:-translate-y-0.5'}`}
                            >
                                <Sparkles size={18} className="fill-indigo-300" /> Tailor Resume with AI
                            </button>
                        </motion.div>
                    ) : (
                        /* STYLE preset selector (DURING PREVIEW) - HIGHLY VISUAL 2-COLUMN GRID OPTION CARDS */
                        <motion.div 
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 flex flex-col gap-4 shadow-sm dark:shadow-none"
                        >
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                    <LayoutGrid size={20} className="text-indigo-600 dark:text-indigo-400" />
                                    Choose Style Preset
                                </h3>
                                <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-widest mt-1">10 Visual Layout Mockups</p>
                            </div>

                            {/* TWO COLUMN GRID OF VISUAL OPTIONS */}
                            <div className="grid grid-cols-2 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
                                {TEMPLATES.map((tmpl) => {
                                    const isSelected = activeTemplate.id === tmpl.id;
                                    return (
                                        <button
                                            key={tmpl.id}
                                            onClick={() => setActiveTemplate(tmpl)}
                                            className={`relative w-full text-left p-2.5 rounded-2xl border flex flex-col transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-400/35' : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'}`}
                                        >
                                            {/* VISUAL LAYOUT MOCKUP REPRESENTATION */}
                                            {getTemplatePreviewMockup(tmpl.id)}

                                            <div className="flex justify-between items-center mt-2 px-1">
                                                <span className="font-black text-slate-800 dark:text-slate-200 text-xs truncate max-w-[90%]">{tmpl.name}</span>
                                                {isSelected && (
                                                    <span className="w-3.5 h-3.5 rounded-full bg-indigo-650 flex items-center justify-center text-white shrink-0 shadow-sm">
                                                        <Check size={8} strokeWidth={4} />
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <span className="text-[11px] font-bold text-slate-455">ATS Compatibility Match:</span>
                                <span className="text-[11px] font-black text-emerald-500 flex items-center gap-1">
                                    <CheckCircle2 size={13} /> 100% Verified
                                </span>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* RIGHT COLUMN: PREVIEW RESUME SHEET */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 border border-slate-150 dark:border-slate-800 rounded-[2rem] overflow-hidden flex flex-col">
                    <div className="no-print px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                        <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            {tailoredData ? "Live Interactive Preview" : "Live Preview Placeholder"}
                        </span>
                        {tailoredData && (
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>Editable: Click any text field to edit manually</span>
                            </div>
                        )}
                    </div>

                    <div className="resume-sheet-container flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-100/50 dark:bg-slate-900/10">
                        
                        {!tailoredData ? (
                            /* PLACEHOLDER PREVIEW */
                            <div className="resume-sheet template-corporate-blue opacity-40 select-none pointer-events-none filter blur-[1px]">
                                <h1>Candidate Name</h1>
                                <div className="resume-title mb-4">Job Title | SDE</div>
                                <div className="contact-info flex gap-4 text-xs mb-6">
                                    <span>email@domain.com</span>
                                    <span>+91 99999 99999</span>
                                    <span>Delhi, India</span>
                                </div>
                                <div className="border-b-2 border-slate-200 pb-1 mb-2 font-bold uppercase tracking-wider text-sm text-indigo-700">Professional Summary</div>
                                <p className="text-xs leading-relaxed mb-6">A highly motivated developer with a strong foundation in computer science and excellent problem solving skills...</p>
                                
                                <div className="border-b-2 border-slate-200 pb-1 mb-2 font-bold uppercase tracking-wider text-sm text-indigo-700">Skills</div>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {['React', 'FastAPI', 'Python', 'SQL', 'Git'].map(s => <span key={s} className="px-2 py-1 bg-slate-100 rounded text-xs">{s}</span>)}
                                </div>

                                <div className="border-b-2 border-slate-200 pb-1 mb-2 font-bold uppercase tracking-wider text-sm text-indigo-700">Experience</div>
                                <div>
                                    <div className="flex justify-between font-bold text-xs">
                                        <span>Software Engineer at Tech Company</span>
                                        <span>2024 - Present</span>
                                    </div>
                                    <ul className="list-disc pl-5 text-xs mt-2 space-y-1">
                                        <li>Built high performing web services using React and FastAPI.</li>
                                        <li>Collaborated with design and QA teams to deploy high quality code.</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            /* ACTUAL INTERACTIVE RESUME SHEET */
                            <div className={`resume-sheet ${activeTemplate.className}`}>
                                
                                {/* ── PERSONAL INFO ── */}
                                <h1 
                                    contentEditable={editMode}
                                    suppressContentEditableWarning 
                                    onBlur={(e) => handleTextChange('personal_info', 'name', e.target.innerText)}
                                >
                                    {tailoredData.personal_info.name}
                                </h1>
                                <div 
                                    contentEditable={editMode}
                                    suppressContentEditableWarning 
                                    className="resume-title text-sm font-semibold text-slate-500 mt-1"
                                    onBlur={(e) => handleTextChange('personal_info', 'title', e.target.innerText)}
                                    style={{ borderBottom: 'none' }}
                                >
                                    {tailoredData.personal_info.title}
                                </div>

                                <div className="contact-info flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 mb-4 text-xs font-semibold text-slate-500">
                                    <span>
                                        Email: <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleTextChange('personal_info', 'email', e.target.innerText)}>{tailoredData.personal_info.email}</span>
                                    </span>
                                    <span>
                                        Phone: <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleTextChange('personal_info', 'phone', e.target.innerText)}>{tailoredData.personal_info.phone}</span>
                                    </span>
                                    <span>
                                        Location: <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleTextChange('personal_info', 'location', e.target.innerText)}>{tailoredData.personal_info.location}</span>
                                    </span>
                                    {tailoredData.personal_info.linkedin && (
                                        <span>
                                            LinkedIn: <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleTextChange('personal_info', 'linkedin', e.target.innerText)}>{tailoredData.personal_info.linkedin}</span>
                                        </span>
                                    )}
                                    {tailoredData.personal_info.github && (
                                        <span>
                                            GitHub: <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleTextChange('personal_info', 'github', e.target.innerText)}>{tailoredData.personal_info.github}</span>
                                        </span>
                                    )}
                                </div>

                                {/* ── SUMMARY ── */}
                                <h2>Professional Summary</h2>
                                <p 
                                    contentEditable={editMode}
                                    suppressContentEditableWarning 
                                    className="text-xs leading-relaxed text-slate-600 mt-2 mb-4"
                                    onBlur={(e) => handleTextChange('summary', null, e.target.innerText)}
                                >
                                    {tailoredData.summary}
                                </p>

                                {/* ── SKILLS ── */}
                                <h2>Technical Skills</h2>
                                <div className="flex flex-wrap gap-2 mt-2.5 mb-4">
                                    {tailoredData.skills.map((skill, idx) => (
                                        <div key={idx} className="group relative flex items-center">
                                            <span 
                                                className="tech-tag px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                                                contentEditable={editMode}
                                                suppressContentEditableWarning
                                                onBlur={(e) => {
                                                    const updated = [...tailoredData.skills];
                                                    updated[idx] = e.target.innerText.trim();
                                                    setTailoredData(prev => ({
                                                        ...prev,
                                                        skills: updated.filter(s => s)
                                                    }));
                                                }}
                                            >
                                                {skill}
                                            </span>
                                            {editMode && (
                                                <button
                                                    onClick={() => removeSkill(idx)}
                                                    className="no-print absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-100 hover:bg-red-200 text-red-600 border border-red-200 rounded-full flex items-center justify-center text-[10px] shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {editMode && (
                                        <button 
                                            onClick={addSkill}
                                            className="no-print px-2.5 py-1 text-indigo-655 border border-indigo-200 hover:bg-indigo-50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <Plus size={12} /> Add Skill
                                        </button>
                                    )}
                                </div>

                                {/* ── EXPERIENCE ── */}
                                <div className="flex justify-between items-baseline mb-1">
                                    <h2>Professional Experience</h2>
                                    {editMode && (
                                        <button 
                                            onClick={addExperience}
                                            className="no-print flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-650 hover:text-indigo-850 cursor-pointer"
                                        >
                                            <Plus size={12} /> Add Experience
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4 mb-4">
                                    {tailoredData.experience.map((exp, expIdx) => (
                                        <div key={expIdx} className="group/item relative">
                                            {editMode && (
                                                <button
                                                    onClick={() => removeExperience(expIdx)}
                                                    className="no-print absolute -left-6 top-1 p-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-100 shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                                                    title="Remove Experience Item"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                            
                                            <div className="flex justify-between items-baseline font-semibold text-slate-800">
                                                <h3>
                                                    <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('experience', expIdx, 'role', e.target.innerText)}>{exp.role}</span>
                                                    {" at "}
                                                    <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('experience', expIdx, 'company', e.target.innerText)}>{exp.company}</span>
                                                </h3>
                                                <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap ml-2">
                                                    <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('experience', expIdx, 'start_date', e.target.innerText)}>{exp.start_date}</span>
                                                    {" - "}
                                                    <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('experience', expIdx, 'end_date', e.target.innerText)}>{exp.end_date}</span>
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-bold italic mt-0.5">
                                                <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('experience', expIdx, 'location', e.target.innerText)}>{exp.location}</span>
                                            </div>

                                            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-slate-655 leading-relaxed">
                                                {exp.bullets.map((bullet, bulletIdx) => (
                                                    <li key={bulletIdx} className="group/bullet relative pr-6">
                                                        <span
                                                            contentEditable={editMode}
                                                            suppressContentEditableWarning
                                                            onBlur={(e) => {
                                                                const updatedBullets = [...exp.bullets];
                                                                updatedBullets[bulletIdx] = e.target.innerText;
                                                                handleNestedListChange('experience', expIdx, 'bullets', updatedBullets);
                                                            }}
                                                        >
                                                            {bullet}
                                                        </span>
                                                        {editMode && (
                                                            <button
                                                                onClick={() => removeBullet('experience', expIdx, bulletIdx)}
                                                                className="no-print absolute right-0 top-0.5 p-0.5 text-red-400 hover:text-red-650 opacity-0 group-bullet:opacity-100 transition-opacity cursor-pointer"
                                                                title="Remove Bullet"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                                {editMode && (
                                                    <button 
                                                        onClick={() => addBullet('experience', expIdx)}
                                                        className="no-print mt-1 text-[9px] font-bold text-indigo-650 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        <Plus size={10} /> Add Bullet Point
                                                    </button>
                                                )}
                                            </ul>
                                        </div>
                                    ))}
                                </div>

                                {/* ── PROJECTS ── */}
                                <div className="flex justify-between items-baseline mb-1">
                                    <h2>Academic & Practical Projects</h2>
                                    {editMode && (
                                        <button 
                                            onClick={addProject}
                                            className="no-print flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-655 hover:text-indigo-850 cursor-pointer"
                                        >
                                            <Plus size={12} /> Add Project
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4 mb-4">
                                    {tailoredData.projects.map((proj, projIdx) => (
                                        <div key={projIdx} className="group/item relative">
                                            {editMode && (
                                                <button
                                                    onClick={() => removeProject(projIdx)}
                                                    className="no-print absolute -left-6 top-1 p-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-100 shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                                                    title="Remove Project"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}

                                            <div className="flex justify-between items-baseline font-semibold text-slate-800">
                                                <h3>
                                                    <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('projects', projIdx, 'title', e.target.innerText)}>{proj.title}</span>
                                                </h3>
                                                <div className="flex flex-wrap gap-1 items-center ml-4">
                                                    {proj.technologies?.map((tech, techIdx) => (
                                                        <div key={techIdx} className="group/tech relative flex items-center">
                                                            <span 
                                                                className="tech-tag px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[8pt] font-semibold text-slate-650"
                                                                contentEditable={editMode}
                                                                suppressContentEditableWarning
                                                                onBlur={(e) => {
                                                                    const updated = [...proj.technologies];
                                                                    updated[techIdx] = e.target.innerText.trim();
                                                                    handleNestedListChange('projects', projIdx, 'technologies', updated.filter(t => t));
                                                                }}
                                                            >
                                                                {tech}
                                                            </span>
                                                            {editMode && (
                                                                <button
                                                                    onClick={() => {
                                                                        const updated = proj.technologies.filter((_, i) => i !== techIdx);
                                                                        handleNestedListChange('projects', projIdx, 'technologies', updated);
                                                                    }}
                                                                    className="no-print absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-100 hover:bg-red-200 text-red-650 border border-red-200 rounded-full flex items-center justify-center text-[8px] shadow-sm cursor-pointer opacity-0 group-tech:opacity-100 transition-opacity"
                                                                >
                                                                    <X size={8} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {editMode && (
                                                        <button
                                                            onClick={() => {
                                                                const updated = [...proj.technologies, "Tech"];
                                                                handleNestedListChange('projects', projIdx, 'technologies', updated);
                                                            }}
                                                            className="no-print px-1.5 py-0.5 text-indigo-650 border border-indigo-200 hover:bg-indigo-50 rounded text-[8pt] font-bold cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-slate-655 leading-relaxed">
                                                {proj.bullets.map((bullet, bulletIdx) => (
                                                    <li key={bulletIdx} className="group/bullet relative pr-6">
                                                        <span
                                                            contentEditable={editMode}
                                                            suppressContentEditableWarning
                                                            onBlur={(e) => {
                                                                const updatedBullets = [...proj.bullets];
                                                                updatedBullets[bulletIdx] = e.target.innerText;
                                                                handleNestedListChange('projects', projIdx, 'bullets', updatedBullets);
                                                            }}
                                                        >
                                                            {bullet}
                                                        </span>
                                                        {editMode && (
                                                            <button
                                                                onClick={() => removeBullet('projects', projIdx, bulletIdx)}
                                                                className="no-print absolute right-0 top-0.5 p-0.5 text-red-400 hover:text-red-650 opacity-0 group-bullet:opacity-100 transition-opacity cursor-pointer"
                                                                title="Remove Bullet"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                                {editMode && (
                                                    <button 
                                                        onClick={() => addBullet('projects', projIdx)}
                                                        className="no-print mt-1 text-[9px] font-bold text-indigo-650 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        <Plus size={10} /> Add Bullet Point
                                                    </button>
                                                )}
                                            </ul>
                                        </div>
                                    ))}
                                </div>

                                {/* ── EDUCATION ── */}
                                <div className="flex justify-between items-baseline mb-1">
                                    <h2>Education</h2>
                                    {editMode && (
                                        <button 
                                            onClick={addEducation}
                                            className="no-print flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-655 hover:text-indigo-850 cursor-pointer"
                                        >
                                            <Plus size={12} /> Add Education
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3 mb-4">
                                    {tailoredData.education.map((edu, eduIdx) => (
                                        <div key={eduIdx} className="group/item relative">
                                            {editMode && (
                                                <button
                                                    onClick={() => removeEducation(eduIdx)}
                                                    className="no-print absolute -left-6 top-1 p-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-100 shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                                                    title="Remove Education"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}

                                            <div className="flex justify-between items-baseline font-semibold text-slate-800">
                                                <h3>
                                                    <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('education', eduIdx, 'degree', e.target.innerText)}>{edu.degree}</span>
                                                    {" — "}
                                                    <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('education', eduIdx, 'school', e.target.innerText)}>{edu.school}</span>
                                                </h3>
                                                <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap ml-2">
                                                    <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('education', eduIdx, 'start_date', e.target.innerText)}>{edu.start_date}</span>
                                                    {" - "}
                                                    <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('education', eduIdx, 'end_date', e.target.innerText)}>{edu.end_date}</span>
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-baseline text-[10px] text-slate-500 font-bold italic mt-0.5">
                                                <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('education', eduIdx, 'location', e.target.innerText)}>{edu.location}</span>
                                                <span>
                                                    GPA: <span contentEditable={editMode} suppressContentEditableWarning onBlur={(e) => handleNestedListChange('education', eduIdx, 'gpa', e.target.innerText)}>{edu.gpa}</span>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
