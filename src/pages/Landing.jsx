import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bot, Sparkles, Brain, CheckCircle2, Eye, EyeOff, 
    ArrowRight, Mic, FileText, Zap, ChevronRight, PlayCircle, X, Briefcase,
    MapPin, Phone, Mail, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
let googleIdentityScriptPromise;

function loadGoogleIdentityScript() {
    if (typeof window === 'undefined') return Promise.reject(new Error('Google Sign-In requires a browser environment.'));
    if (window.google?.accounts?.id) return Promise.resolve(window.google);
    if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

    googleIdentityScriptPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[data-google-identity="true"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.google), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Google Sign-In script failed to load.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        script.onload = () => resolve(window.google);
        script.onerror = () => reject(new Error('Google Sign-In script failed to load.'));
        document.head.appendChild(script);
    });

    return googleIdentityScriptPromise;
}

function getNameParts(fullName, fallbackEmail) {
    const baseName = fullName.trim() || fallbackEmail.split('@')[0] || 'Student';
    const parts = baseName.split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || 'Student',
        lastName: parts.slice(1).join(' ') || 'Learner',
    };
}

const YEAR_OPTIONS = [
    { value: 1, label: 'Year 1' },
    { value: 2, label: 'Year 2' },
    { value: 3, label: 'Year 3' },
    { value: 4, label: 'Year 4' },
];

const TESTIMONIALS = [
    {
        name: "Aditi Awasthi",
        role: "Software Engineering Student",
        company: "Aao Seekhe Alumni",
        image: "/testimonials/Aditi Awasthi.jpg",
        text: "Aao Seekhe's ATS optimizer helped me refine my resume keywords. I went from getting zero callbacks to securing multiple interviews!"
    },
    {
        name: "Avnish Mishra",
        role: "Frontend Developer",
        company: "Aao Seekhe Alumni",
        image: "/testimonials/Avnish Mishra.jpg",
        text: "The AI Mock Interview Coach is incredibly realistic. The detailed feedback reports and model answer suggestions helped me overcome my interview anxiety."
    },
    {
        name: "Ayushi Singh",
        role: "Data Analyst Trainee",
        company: "Aao Seekhe Alumni",
        image: "/testimonials/Ayushi Singh.jpg",
        text: "The premium templates are highly professional and completely ATS-friendly. Helped me format my SDE resume perfectly."
    },
    {
        name: "Dimple Motwani",
        role: "Software Engineer",
        company: "Oracle",
        image: "/testimonials/Dimple Motwani Oracle.png",
        text: "I used the STAR interview coach to prepare for Oracle. The structured feedback on my behavioral answers was game-changing!"
    },
    {
        name: "Divyansh Yadav",
        role: "Full Stack Engineer",
        company: "Aao Seekhe Alumni",
        image: "/testimonials/Divyansh Yadav.jpg",
        text: "The email outreach writer saved me hours. I got response rates I've never seen before on LinkedIn cold outreach."
    },
    {
        name: "Pratyaksha Shrivastava",
        role: "Graduate Engineer Trainee",
        company: "Mercedes-Benz",
        image: "/testimonials/Pratyaksha Shrivastava- Mercedez benz.png",
        text: "Preparing for Mercedes-Benz was tough, but simulating interviews with the AI Coach gave me the confidence I needed."
    },
    {
        name: "Ruchita Singh",
        role: "Software Engineer Trainee",
        company: "Aao Seekhe Alumni",
        image: "/testimonials/Ruchita Singh.jpg",
        text: "Highly recommend the AI roadmap tools! It gives you a clear path on what projects to build and how to pitch them."
    },
    {
        name: "Salem Subhati",
        role: "Tech Intern",
        company: "Aao Seekhe Alumni",
        image: "/testimonials/Salem Subhati.jpeg",
        text: "Aao Seekhe completely transformed my placement prep. The dynamic dashboard keeps all my progress organized in one place."
    },
    {
        name: "Shraddha Gupta",
        role: "Systems Engineer",
        company: "Intel",
        image: "/testimonials/Shraddha Gupta - Intel.jpeg",
        text: "Got selected at Intel! The ATS keyword check and real-time score calculation were extremely accurate."
    },
    {
        name: "Soro Soulegame Abu",
        role: "International Student",
        company: "Ivory Coast",
        image: "/testimonials/Soro Soulegame Abu - Ivory Coast.jpeg",
        text: "As an international student, the interactive reading comprehension quizzes and communication modules helped me improve my written expression and overall confidence immensely."
    },
    {
        name: "Sourav Choudhary",
        role: "React SDE Trainee",
        company: "Aao Seekhe Alumni",
        image: "/testimonials/sourav choudhary image.JPG",
        text: "The portfolio builder and blog generator helped me stand out to recruiters as a proactive developer."
    },
    {
        name: "Tejaswi Jain",
        role: "Application Developer",
        company: "IBM",
        image: "/testimonials/Tejaswi Jain IBM.png",
        text: "Secured an offer at IBM. The automated assessment wizards and layout customization are unmatched."
    },
    {
        name: "Vipin Yadav",
        role: "SDE Trainee",
        company: "Aao Seekhe Alumni",
        image: "/testimonials/Vipin Yadav.jpg",
        text: "The mock sessions and automated feedback reports are top-tier. Helped me practice structured answers and improve my response scores."
    }
];

// ── Auth Modal Component ────────────────────────────────────────────────────
function AuthModal({ isOpen, onClose, initialView = 'login' }) {
    const { login, register, loginWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [isSignUp, setIsSignUp] = useState(initialView === 'signup');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // Validation states
    const [validationErrors, setValidationErrors] = useState({
        name: '',
        email: '',
        password: '',
        year: '',
    });
    const [touched, setTouched] = useState({
        name: false,
        email: false,
        password: false,
        year: false,
    });
    
    const googleButtonRef = useRef(null);

    useEffect(() => { 
        setIsSignUp(initialView === 'signup'); 
        // Reset validation when switching modes
        setValidationErrors({ name: '', email: '', password: '', year: '' });
        setTouched({ name: false, email: false, password: false, year: false });
        setErrorMessage('');
        setSelectedYear('');
    }, [initialView, isOpen]);

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) return 'Email is required';
        if (!emailRegex.test(email)) return 'Please enter a valid email address';
        return '';
    };

    const validatePassword = (password, isSignup = false) => {
        if (!password) return 'Password is required';
        if (!isSignup) return '';
        if (password.length < 6) return 'Password must be at least 6 characters long';
        if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase and one lowercase letter';
        if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
        return '';
    };

    const validateName = (name) => {
        if (!name.trim()) return 'Full name is required';
        if (name.trim().length < 2) return 'Name must be at least 2 characters long';
        if (!/^[a-zA-Z\s]+$/.test(name.trim())) return 'Name can only contain letters and spaces';
        return '';
    };

    const validateAcademicYear = (year) => {
        if (!isSignUp) return '';
        const numericYear = Number(year);
        if (!numericYear) return 'Academic year is required';
        if (numericYear < 1 || numericYear > 4) return 'Academic year must be between 1 and 4';
        return '';
    };

    const validateField = (fieldName, value) => {
        let error = '';
        switch (fieldName) {
            case 'email':
                error = validateEmail(value);
                break;
            case 'password':
                error = validatePassword(value, isSignUp);
                break;
            case 'name':
                error = validateName(value);
                break;
            case 'year':
                error = validateAcademicYear(value);
                break;
            default:
                break;
        }
        setValidationErrors(prev => ({ ...prev, [fieldName]: error }));
        return error;
    };

    const handleFieldChange = (fieldName, value) => {
        // Update field value
        switch (fieldName) {
            case 'email':
                setEmail(value);
                break;
            case 'password':
                setPassword(value);
                break;
            case 'name':
                setName(value);
                break;
            case 'year':
                setSelectedYear(value);
                break;
            default:
                break;
        }
        
        // Clear error if field was previously touched and now valid
        if (touched[fieldName]) {
            validateField(fieldName, value);
        }
    };

    const handleFieldBlur = (fieldName) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));
        const value = fieldName === 'email'
            ? email
            : fieldName === 'password'
                ? password
                : fieldName === 'year'
                    ? selectedYear
                    : name;
        validateField(fieldName, value);
    };

    const validateForm = () => {
        const errors = {
            email: validateEmail(email),
            password: validatePassword(password, isSignUp),
            name: isSignUp ? validateName(name) : '',
            year: isSignUp ? validateAcademicYear(selectedYear) : '',
        };
        
        setValidationErrors(errors);
        setTouched({ name: true, email: true, password: true, year: true });
        
        return !Object.values(errors).some(error => error !== '');
    };

    const selectedYearRef = useRef('');
    const isSignUpRef = useRef(isSignUp);

    useEffect(() => {
        selectedYearRef.current = selectedYear;
    }, [selectedYear]);

    useEffect(() => {
        isSignUpRef.current = isSignUp;
    }, [isSignUp]);

    useEffect(() => {
        if (!isOpen || !GOOGLE_CLIENT_ID) return;
        let isMounted = true;
        const renderGoogle = async () => {
            try {
                const google = await loadGoogleIdentityScript();
                if (!isMounted || !googleButtonRef.current) return;
                
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: async ({ credential }) => {
                        if (!credential) return;
                        const currentIsSignUp = isSignUpRef.current;
                        const currentYear = selectedYearRef.current;
                        if (currentIsSignUp && !currentYear) {
                            setErrorMessage('Please select your academic year from the dropdown first to complete your sign-up.');
                            return;
                        }
                        setIsSubmitting(true);
                        setErrorMessage('');
                        try {
                            await loginWithGoogle({ credential, year: currentIsSignUp ? Number(currentYear) : undefined });
                        } catch (error) {
                            setErrorMessage(error.message || 'Google sign-in failed.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    },
                });
                google.accounts.id.renderButton(googleButtonRef.current, {
                    theme: 'outline', size: 'large', type: 'standard', width: 320,
                });
            } catch (e) { console.error("Google button rendering error:", e); }
        };
        setTimeout(renderGoogle, 200);
        return () => { isMounted = false; };
    }, [isOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setIsSubmitting(true); 
        setErrorMessage('');
        try {
            if (isSignUp) {
                const { firstName, lastName } = getNameParts(name, email);
                await register({ email, password, firstName, lastName, year: Number(selectedYear) });
            } else {
                await login({ email, password });
            }
        } catch (error) { 
            setErrorMessage(error.message || 'Authentication failed.'); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 md:p-6"
                onClick={onClose}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full max-w-4xl h-[90vh] md:h-[650px] bg-white shadow-2xl flex flex-col md:flex-row relative rounded-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}>
                    
                    {/* Left Column - Visual Showcase Pane (Hidden on mobile) */}
                    <div className="hidden md:flex md:w-1/2 bg-slate-950 relative overflow-hidden flex-col justify-between p-12 text-white">
                        {/* Background Image with Mix Blend Mode & Subtle Overlay */}
                        <div className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-overlay scale-105" style={{ backgroundImage: "url('/login_showcase.png')" }} />
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-slate-950/95 to-indigo-950/90 z-0" />
                        
                        {/* Dynamic Floating Glowing Orbs for Aesthetic Wow-Factor */}
                        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/25 rounded-full blur-[120px] pointer-events-none" />
                        
                        {/* Top Header Section inside Showcase */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <img src="/logo.webp" alt="Aao Seekhe Live" className="h-10 w-auto" />
                            </div>
                            <h3 className="text-3xl font-black font-heading leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                                Empowering Your <br/>Career Journey
                            </h3>
                            <p className="text-indigo-200/70 text-sm mt-3 leading-relaxed max-w-sm">
                                Elevate your potential with a suite of hyper-personalized tools, automated resume optimizers, and tailored AI mocks.
                            </p>
                        </div>
                        
                        {/* Floating Glassmorphic Features Pane */}
                        <div className="relative z-10 space-y-4 my-auto">
                            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-start gap-4 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:translate-x-1">
                                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                                    <Zap size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">ATS Score Calculator</h4>
                                    <p className="text-slate-300 text-xs mt-0.5">Optimize and score your resume dynamically in real-time against targeted role profiles.</p>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-start gap-4 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:translate-x-1">
                                <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300">
                                    <Brain size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">STAR Interview Coach</h4>
                                    <p className="text-slate-300 text-xs mt-0.5">Engage in mock interview sessions and perfect your structured behavioral answers.</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Testimonial / Social Proof Footer inside Showcase */}
                        <div className="relative z-10 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full border border-slate-900 bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md">AS</div>
                                    <div className="w-8 h-8 rounded-full border border-slate-900 bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md">JD</div>
                                    <div className="w-8 h-8 rounded-full border border-slate-900 bg-amber-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md">KB</div>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-300">Join 10,000+ students & professionals</p>
                                    <p className="text-[10px] text-slate-400">Accelerating career transitions with AI models.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column - Form Pane */}
                    <div className="w-full md:w-1/2 h-full flex flex-col justify-between p-8 md:p-12 relative overflow-y-auto bg-slate-50/50">
                        {/* Close button */}
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-[10]">
                            <X size={20} />
                        </button>
                        
                        <div className="w-full max-w-sm mx-auto flex flex-col justify-center h-full space-y-6">
                            
                            {/* Logo and Greeting */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 md:hidden">
                                    <img src="/logo.webp" alt="Aao Seekhe" className="h-6" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 font-heading tracking-tight leading-none">
                                    {isSignUp ? 'Create account' : 'Welcome back'}
                                </h2>
                                <p className="text-slate-500 text-sm mt-2">
                                    {isSignUp ? 'Master the perfect resume and pass every interview.' : 'Sign in to access your modules & resume metrics.'}
                                </p>
                            </div>
                            
                            {/* Login/Signup Tabs */}
                            <div className="flex p-1 bg-slate-100 rounded-xl">
                                <button type="button" 
                                    onClick={() => { setIsSignUp(false); setValidationErrors({ name: '', email: '', password: '', year: '' }); setTouched({ name: false, email: false, password: false, year: false }); setErrorMessage(''); }} 
                                    className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${!isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Log In
                                </button>
                                <button type="button" 
                                    onClick={() => { setIsSignUp(true); setValidationErrors({ name: '', email: '', password: '', year: '' }); setTouched({ name: false, email: false, password: false, year: false }); setErrorMessage(''); }} 
                                    className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Sign Up
                                </button>
                            </div>
                            
                            {/* Scrollable Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <AnimatePresence mode="wait">
                                    {isSignUp && (
                                        <motion.div 
                                            key="signup-fields"
                                            initial={{ height: 0, opacity: 0 }} 
                                            animate={{ height: 'auto', opacity: 1 }} 
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-4 overflow-hidden"
                                        >
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Full Name</label>
                                                <input 
                                                    type="text" 
                                                    className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none transition-all ${validationErrors.name && touched.name ? 'border-red-300 bg-red-50/50 focus:ring-red-100 focus:border-red-400' : 'border-slate-200'}`} 
                                                    placeholder="e.g. Lara Croft" 
                                                    value={name} 
                                                    onChange={(e) => handleFieldChange('name', e.target.value)} 
                                                    onBlur={() => handleFieldBlur('name')}
                                                    disabled={isSubmitting} 
                                                />
                                                {validationErrors.name && touched.name && (
                                                    <p className="text-red-500 text-xs font-semibold mt-1 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> {validationErrors.name}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Academic Year</label>
                                                <select
                                                    className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none transition-all ${validationErrors.year && touched.year ? 'border-red-300 bg-red-50/50 focus:ring-red-100 focus:border-red-400' : 'border-slate-200'}`}
                                                    value={selectedYear}
                                                    onChange={(e) => handleFieldChange('year', e.target.value)}
                                                    onBlur={() => handleFieldBlur('year')}
                                                    disabled={isSubmitting}
                                                >
                                                    <option value="" disabled>Select academic year</option>
                                                    {YEAR_OPTIONS.map((year) => (
                                                        <option key={year.value} value={year.value}>
                                                            {year.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {validationErrors.year && touched.year && (
                                                    <p className="text-red-500 text-xs font-semibold mt-1 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> {validationErrors.year}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Email Address</label>
                                    <input 
                                        type="email" 
                                        className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none transition-all ${validationErrors.email && touched.email ? 'border-red-300 bg-red-50/50 focus:ring-red-100 focus:border-red-400' : 'border-slate-200'}`} 
                                        placeholder="you@domain.com" 
                                        value={email} 
                                        onChange={(e) => handleFieldChange('email', e.target.value)} 
                                        onBlur={() => handleFieldBlur('email')}
                                        disabled={isSubmitting} 
                                    />
                                    {validationErrors.email && touched.email && (
                                        <p className="text-red-500 text-xs font-semibold mt-1 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> {validationErrors.email}
                                        </p>
                                    )}
                                </div>
                                
                                <div className="relative">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Password</label>
                                        {!isSignUp && (
                                            <a href="#" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                                                Forgot password?
                                            </a>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            className={`w-full pl-4 pr-10 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none transition-all ${validationErrors.password && touched.password ? 'border-red-300 bg-red-50/50 focus:ring-red-100 focus:border-red-400' : 'border-slate-200'}`} 
                                            placeholder="••••••••" 
                                            value={password} 
                                            onChange={(e) => handleFieldChange('password', e.target.value)} 
                                            onBlur={() => handleFieldBlur('password')}
                                            disabled={isSubmitting} 
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {validationErrors.password && touched.password && (
                                        <p className="text-red-500 text-xs font-semibold mt-1 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> {validationErrors.password}
                                        </p>
                                    )}
                                </div>
                                
                                {errorMessage && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                        <p className="text-red-600 text-xs font-semibold">{errorMessage}</p>
                                    </div>
                                )}
                                
                                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {isSignUp ? 'Create Account' : 'Sign In'}
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                                

                                
                                <div className="flex justify-center w-full min-h-[44px]">
                                    <div ref={googleButtonRef} className="w-full flex justify-center [&>div]:w-full [&>div]:max-w-xs [&_iframe]:mx-auto" />
                                </div>
                            </form>
                            
                            {/* Footer note */}
                            <p className="text-center text-[10px] text-slate-400 leading-normal">
                                By signing up, you agree to our <a href="#" className="underline hover:text-slate-600">Terms of Service</a> and <a href="#" className="underline hover:text-slate-600">Privacy Policy</a>.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ── Landing Page ────────────────────────────────────────────────────────────
function Landing() {
    const [authOpen, setAuthOpen] = useState(false);
    const [authView, setAuthView] = useState('login');
    const [activeTab, setActiveTab] = useState(0); // 0 = Choose Design, 1 = AI Customizer, 2 = ATS Score Check
    const [selectedStyle, setSelectedStyle] = useState('corporate'); // corporate, academic, minimal
    const [atsCounter, setAtsCounter] = useState(0);

    const openAuth = (view) => {
        setAuthView(view);
        setAuthOpen(true);
    };

    // Trigger score gauge count up animation when active tab changes to ATS Score Check (tab 2)
    useEffect(() => {
        if (activeTab === 2) {
            setAtsCounter(0);
            let start = 0;
            const end = 94;
            const duration = 1200;
            const increment = end / (duration / 16);
            
            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    setAtsCounter(end);
                    clearInterval(timer);
                } else {
                    setAtsCounter(Math.floor(start));
                }
            }, 16);
            return () => clearInterval(timer);
        }
    }, [activeTab]);

    const stepsList = [
        {
            title: '1. Select Premium Layout',
            subtitle: 'Click visual presets to instantly style templates.',
            desc: 'Choose from slate blue highlights, horizontal lines, or high-breathing whitespace presets that automatically adapt to your content.'
        },
        {
            title: '2. Generate AI Customization',
            subtitle: 'Polishes achievements using active STAR verbs.',
            desc: 'Formulates achievements using quantifiable SDE verbs, injecting target skills into job description summaries.'
        },
        {
            title: '3. Run ATS Score Check',
            subtitle: 'Verifies keyword relevance against exact job requirements.',
            desc: 'Scans your resume matching core keywords to calculate your dynamic, parseable match score.'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-100 flex flex-col relative overflow-hidden">
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialView={authView} />
            
            {/* Background glowing blurred radial patterns */}
            <div className="absolute top-0 left-0 w-full h-[1000px] overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[65%] h-[100%] bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-emerald-500/10 rounded-full blur-[140px] mix-blend-multiply dark:mix-blend-normal"></div>
                <div className="absolute top-[10%] -left-[10%] w-[55%] h-[90%] bg-gradient-to-tr from-rose-500/10 via-amber-500/8 to-violet-500/10 rounded-full blur-[130px] mix-blend-multiply dark:mix-blend-normal"></div>
            </div>

            {/* Header */}
            <header className="max-w-7xl mx-auto px-6 h-24 w-full flex items-center justify-between z-10">
                <div className="flex items-center">
                    <img src="/logo.webp" alt="Aao Seekhe Live" className="h-10 w-auto" />
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-extrabold text-slate-500 dark:text-slate-400">
                    <a href="#features" className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[11px]">Platform Features</a>
                    <a href="#process" className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[11px]">Dynamic Workflow</a>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => openAuth('login')} className="text-sm font-semibold text-slate-700 dark:text-slate-350 hover:text-indigo-600 transition-colors">Log in</button>
                    <button onClick={() => openAuth('signup')} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-full transition-all hover:shadow-md active:scale-95 transition-transform">Get Started</button>
                </div>
            </header>

            {/* HERO SECTION */}
            <main className="flex-1 max-w-7xl mx-auto px-6 pt-12 md:pt-20 pb-28 flex flex-col lg:flex-row items-center gap-16 z-10 w-full">
                
                {/* Hero Left Content */}
                <div className="flex-1 text-center lg:text-left flex flex-col gap-6 md:gap-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        
                        {/* Rating Star Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-900 border border-indigo-100 dark:border-slate-800 text-indigo-700 dark:text-indigo-400 text-xs font-black uppercase tracking-widest rounded-full mb-6 shadow-sm">
                            <span className="flex items-center gap-0.5 text-amber-500 mr-1.5">
                                ★★★★★
                            </span>
                            5-Star AI Platform
                        </div>
                        
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.08] mb-6 tracking-tight font-heading">
                            Create your perfect <br />
                            <span className="animate-text-gradient">career roadmap.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-semibold">
                            Instantly tailor your resume with 10 premium layouts, optimize keywords with our ATS analyzer, and simulate realistic mock interviews with live AI coach feedback.
                        </p>
                        
                        {/* Hero CTAs */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <button onClick={() => openAuth('signup')} className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-md hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 text-base group">
                                Create My Account <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                            </button>
                        </div>
                        
                        <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Free to Onboard</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-700 hidden sm:inline" />
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> ATS-Friendly Output</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-700 hidden sm:inline" />
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Automated Seeding</span>
                        </div>
                        
                    </motion.div>
                </div>
                
                {/* HERO RIGHT: Interactive SaaS Product Preview Console */}
                <div className="flex-1 w-full max-w-xl lg:max-w-none relative perspective-1000">
                    
                    {/* Floating Badges */}
                    <div className="absolute -top-6 -left-6 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 p-4.5 rounded-2xl shadow-lg flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                            94%
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">ATS Success Rate</p>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">Optimized Shortlisting</p>
                        </div>
                    </div>

                    <div className="absolute -bottom-6 -right-6 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 p-4.5 rounded-2xl shadow-lg flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                            <Bot size={20} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">AI Interview Coach</p>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">Instant Speech Metrics</p>
                        </div>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, rotateY: 8, rotateX: 6, scale: 0.96 }} 
                        animate={{ opacity: 1, rotateY: 0, rotateX: 0, scale: 1 }} 
                        transition={{ duration: 0.6 }}
                        className="relative z-10 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-6"
                    >
                        {/* Terminal Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-full bg-rose-500" />
                                <span className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">aaoseekhe.live console</span>
                            </div>
                            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/40 rounded-md border border-rose-200/50 dark:border-rose-900/30">
                            Live Preview
                            </span>
                        </div>

                        {/* Interactive Tab switchers */}
                        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                            {['Design', 'AI Customizer', 'ATS Gauge'].map((tab, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveTab(idx)}
                                    className={`py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === idx ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Dynamic Interactive Sheet content */}
                        <div className="flex-1 min-h-[300px] bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4">
                            <AnimatePresence mode="wait">
                                
                                {/* Step 0: Design Selector & Live Style Preview */}
                                {activeTab === 0 && (
                                    <motion.div 
                                        key="step0" 
                                        initial={{ opacity: 0, y: 10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex flex-col gap-4 h-full"
                                    >
                                        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Switch Style:</span>
                                            <div className="flex gap-2">
                                                {['corporate', 'academic', 'minimal'].map((style) => (
                                                    <button
                                                        key={style}
                                                        type="button"
                                                        onClick={() => setSelectedStyle(style)}
                                                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md border transition-all ${selectedStyle === style ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                                    >
                                                        {style}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Styled Resume Preview Sheet card */}
                                        <div className={`flex-1 p-5 rounded-xl border shadow-xs transition-all duration-350 ${
                                            selectedStyle === 'corporate' ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 font-sans' :
                                            selectedStyle === 'academic' ? 'bg-white dark:bg-slate-900 border-slate-350 dark:border-slate-750 font-serif' :
                                            'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-sans text-center'
                                        }`}>
                                            <h4 className={`font-black text-slate-955 dark:text-white tracking-tight ${selectedStyle === 'minimal' ? 'text-xl' : 'text-lg'}`}>
                                                Rajat Tripathi
                                            </h4>
                                            <p className={`text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 mt-1 ${selectedStyle === 'academic' ? 'italic' : ''}`}>
                                                Software Development Engineer
                                            </p>
                                            
                                            <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-800 my-3" />
                                            
                                            <div className={`space-y-2 text-left ${selectedStyle === 'minimal' ? 'text-center' : ''}`}>
                                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Experience</p>
                                                <div className="pl-2 border-l-2 border-blue-500/20 dark:border-blue-500/40">
                                                    <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                                                        <span>FastAPI Backend Developer</span>
                                                        <span className="text-slate-400">2026 - Present</span>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">• Implemented dynamic statistical calculation engines in Postgres SQL.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Step 1: AI Writing Optimization */}
                                {activeTab === 1 && (
                                    <motion.div 
                                        key="step1" 
                                        initial={{ opacity: 0, y: 10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex flex-col gap-4 justify-between h-full"
                                    >
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Prompt Input</span>
                                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 italic">
                                                "Write a summary for SDE target JD, focusing on FastAPI development."
                                            </div>
                                        </div>

                                        <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between font-mono text-[11px] text-emerald-400 leading-relaxed shadow-inner">
                                            <div>
                                                <span className="text-slate-500">$ python compile_summary.py</span>
                                                <div className="mt-2 text-white">
                                                    [AI Processing summary...]
                                                </div>
                                                <motion.p 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.4, duration: 1 }}
                                                    className="mt-2 text-emerald-400"
                                                >
                                                    "Highly motivated Software Engineer specialized in FastAPI backend architecture, Docker containers, and dynamic Postgres schemas. Quantifiably boosted API shortcut response latency by 28%."
                                                </motion.p>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-extrabold uppercase mt-2">
                                                ✓ Injected ATS keywords: FastAPI, Postgres, API.
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Step 2: ATS Matching Circle & Pill Tags */}
                                {activeTab === 2 && (
                                    <motion.div 
                                        key="step2" 
                                        initial={{ opacity: 0, y: 10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex flex-col sm:flex-row items-center gap-6 h-full justify-center"
                                    >
                                        {/* Custom circular score */}
                                        <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="42" stroke="rgba(79, 70, 229, 0.1)" strokeWidth="8" fill="transparent" />
                                                <motion.circle 
                                                    initial={{ strokeDasharray: "0 264" }}
                                                    animate={{ strokeDasharray: `${(atsCounter / 100) * 264} 264` }}
                                                    transition={{ duration: 1.2 }}
                                                    cx="50" cy="50" r="42" stroke="url(#console-grad)" strokeWidth="8" fill="transparent" strokeLinecap="round" 
                                                />
                                                <defs>
                                                    <linearGradient id="console-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#4f46e5" />
                                                        <stop offset="100%" stopColor="#ec4899" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="absolute flex flex-col items-center">
                                                <span className="text-2xl font-black text-slate-900 dark:text-white">{atsCounter}%</span>
                                                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">ATS Match</span>
                                            </div>
                                        </div>

                                        {/* Keyword labels */}
                                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Matched Keywords</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {['FastAPI', 'React', 'SQL', 'Git'].map((kw) => (
                                                        <span key={kw} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md text-[9px] font-bold border border-emerald-500/20">{kw}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Missing Checked</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {['Unit Testing', 'CI/CD'].map((kw) => (
                                                        <span key={kw} className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md text-[9px] font-bold border border-rose-500/20">{kw}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>

                        {/* Interactive Steps timelines descriptions */}
                        <div className="p-4 bg-slate-100/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-1.5">
                            <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
                                {stepsList[activeTab].title}
                            </h4>
                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                {stepsList[activeTab].subtitle}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                                {stepsList[activeTab].desc}
                            </p>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* PROCESS METRICS TIMELINE */}
            <section id="process" className="py-20 border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-4">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
                            High-fidelity <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">dynamic workflow.</span>
                        </h2>
                        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                            A seamless step-by-step career alignment pipeline designed to boost shortlist ratios and confidence.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {stepsList.map((step, idx) => {
                            const stepColors = [
                                { 
                                    border: 'hover:border-blue-400 dark:hover:border-blue-800', 
                                    shadow: 'hover:shadow-[0_15px_35px_-5px_rgba(59,130,246,0.18)]',
                                    num: 'text-blue-600/20 dark:text-blue-400/25 animate-glow-blue', 
                                    heading: 'border-blue-100 dark:border-blue-900', 
                                    topBar: 'bg-gradient-to-r from-blue-500 to-indigo-500',
                                    float: 'animate-float-blue'
                                },
                                { 
                                    border: 'hover:border-rose-400 dark:hover:border-rose-800', 
                                    shadow: 'hover:shadow-[0_15px_35px_-5px_rgba(244,63,94,0.18)]',
                                    num: 'text-rose-600/20 dark:text-rose-400/25 animate-glow-rose', 
                                    heading: 'border-rose-100 dark:border-rose-900', 
                                    topBar: 'bg-gradient-to-r from-rose-500 to-pink-500',
                                    float: 'animate-float-rose'
                                },
                                { 
                                    border: 'hover:border-amber-400 dark:hover:border-amber-800', 
                                    shadow: 'hover:shadow-[0_15px_35px_-5px_rgba(245,158,11,0.18)]',
                                    num: 'text-amber-600/20 dark:text-amber-400/25 animate-glow-amber', 
                                    heading: 'border-amber-100 dark:border-amber-900', 
                                    topBar: 'bg-gradient-to-r from-amber-500 to-orange-500',
                                    float: 'animate-float-amber'
                                }
                            ];
                            const currentTheme = stepColors[idx % 3];
                            return (
                                <div key={idx} className={`bg-white dark:bg-slate-950 p-8 pt-10 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4 relative group hover:-translate-y-1.5 ${currentTheme.border} ${currentTheme.shadow} ${currentTheme.float} transition-all duration-350 overflow-hidden`}>
                                    {/* Top colored accent bar */}
                                    <div className={`absolute top-0 left-0 w-full h-[5px] ${currentTheme.topBar}`} />
                                    
                                    <div className={`absolute top-6 right-6 text-6xl font-black ${currentTheme.num} select-none`}>
                                        0{idx + 1}
                                    </div>
                                    <h3 className={`text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider border-b ${currentTheme.heading} pb-3`}>
                                        {step.title.split('. ')[1]}
                                    </h3>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-350 mt-1">{step.subtitle}</p>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">{step.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* FEATURES BENTO GRID: Comprehensive LMS Career Center */}
            <section id="features" className="py-24 border-t border-slate-200 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/40 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-4">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600">Smart Career Suite</span>
                        </h2>
                        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                            Everything you need to step confidently into your next big placement, powered by personalized AI algorithms.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                        
                        {/* Big Card: Live AI Mock Interview Coach */}
                        <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden group border border-slate-800 flex flex-col justify-between min-h-[340px] hover:shadow-[0_20px_50px_rgba(79,70,229,0.15)] transition-all duration-500">
                            <div className="absolute right-0 bottom-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-rose-500/5 blur-3xl rounded-full group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
                            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500"></div>
                            
                            <div className="flex flex-col gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                                    <Mic size={22} className="text-indigo-400" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white">AI Mock Interview Coach</h3>
                                <p className="text-slate-400 text-sm sm:text-base max-w-lg font-semibold leading-relaxed">
                                    Practice situational and technical placement interviews with LLaMA processing. Receive dynamic, granular coaching feedback and model answer suggestions based on your responses.
                                </p>
                            </div>
                            <button onClick={() => openAuth('signup')} className="mt-8 text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 hover:text-indigo-300 transition-colors w-max relative z-10">
                                Try Mock Coach <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Card 2: Custom Resume Templates Sidebar presets */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[340px] hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-rose-500 to-amber-500"></div>
                            <div className="flex flex-col gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
                                    <Briefcase size={20} className="text-rose-500" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-amber-600 tracking-tight">Custom Resume Templates</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold leading-relaxed">
                                    Format documents using 10 premium typographical presets calibrated for a strict, ATS-friendly one-page print limit.
                                </p>
                            </div>
                            <div className="mt-8 font-heading text-5xl font-black bg-gradient-to-r from-rose-500/10 to-amber-500/10 bg-clip-text text-transparent select-none group-hover:scale-105 transition-transform duration-300">
                                PDF 10x
                            </div>
                        </div>

                        {/* Card 3: ATS Score Calculator check */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[220px] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-blue-500 to-teal-500"></div>
                            <div className="flex flex-col gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
                                    <FileText size={18} className="text-blue-500" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 tracking-tight">ATS Score Calculator</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed">
                                    Perform keyword density scans against job descriptions to dynamically identify formatting gaps.
                                </p>
                            </div>
                        </div>

                        {/* Card 4: Email outreach writer */}
                        <div className="md:col-span-2 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-slate-900 dark:to-slate-950/80 rounded-[2.5rem] p-8 border border-indigo-100/80 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-8 justify-between hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center">
                                    <Sparkles size={18} className="fill-purple-400 text-purple-600" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 tracking-tight">Email Outreach & Blog Creator</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold leading-relaxed">
                                    Draft follow-ups, cold cover letters, and thought-leadership SDE blog posts instantly with advanced AI writer integrations.
                                </p>
                            </div>
                            <div className="w-full sm:w-64 h-32 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-indigo-100/80 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-350 font-semibold p-4 text-xs italic leading-relaxed text-center">
                                "Hi placement team, thank you for organizing the technical mock session today..."
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* TESTIMONIALS SECTION */}
            <section id="testimonials" className="py-24 border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 mb-16 text-center flex flex-col gap-4">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
                        Approved by <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">placement alumni.</span>
                    </h2>
                    <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-semibold leading-relaxed max-w-2xl mx-auto">
                        Here's how students and professionals leverage Aao Seekhe Live to land roles at leading global companies.
                    </p>
                </div>

                {/* Infinite Marquee Container */}
                <div className="flex flex-col gap-8 w-full relative z-10 select-none">
                    
                    {/* Row 1: Left moving */}
                    <div className="w-full overflow-hidden flex [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
                        <div className="animate-marquee-left flex gap-6">
                            {[...TESTIMONIALS.slice(0, 7), ...TESTIMONIALS.slice(0, 7)].map((t, idx) => (
                                <div key={idx} className="w-[350px] shrink-0 bg-slate-50 dark:bg-slate-950/60 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <img 
                                            src={t.image} 
                                            alt={t.name} 
                                            className="w-12 h-12 rounded-full object-cover border border-slate-250 dark:border-slate-800 bg-slate-100"
                                            onError={(e) => {
                                                e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${t.name}`;
                                            }}
                                        />
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white">{t.name}</h4>
                                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{t.role}</p>
                                            <span className="inline-block px-2 py-0.5 mt-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md text-[9px] font-bold border border-indigo-100 dark:border-indigo-900/30">
                                                {t.company}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-amber-500 text-xs font-bold select-none">★★★★★</div>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                                        "{t.text}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row 2: Right moving */}
                    <div className="w-full overflow-hidden flex [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
                        <div className="animate-marquee-right flex gap-6">
                            {[...TESTIMONIALS.slice(7), ...TESTIMONIALS.slice(7)].map((t, idx) => (
                                <div key={idx} className="w-[350px] shrink-0 bg-slate-50 dark:bg-slate-950/60 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <img 
                                            src={t.image} 
                                            alt={t.name} 
                                            className="w-12 h-12 rounded-full object-cover border border-slate-250 dark:border-slate-800 bg-slate-100"
                                            onError={(e) => {
                                                e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${t.name}`;
                                            }}
                                        />
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white">{t.name}</h4>
                                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{t.role}</p>
                                            <span className="inline-block px-2 py-0.5 mt-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md text-[9px] font-bold border border-indigo-100 dark:border-indigo-900/30">
                                                {t.company}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-amber-500 text-xs font-bold select-none">★★★★★</div>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                                        "{t.text}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </section>

            {/* BOTTOM CONVERSION HERO ACTION CTA */}
            <section className="bg-slate-950 py-20 text-center relative overflow-hidden border-t border-slate-900">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="relative z-10 max-w-2xl mx-auto px-6 flex flex-col items-center gap-6">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight font-heading">
                        Ready to accelerate your professional career?
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base font-semibold leading-relaxed">
                        Join placement students today. Upload your resume, configure baseline curriculum assessments, and start mock interviews in minutes.
                    </p>
                    <button onClick={() => openAuth('signup')} className="mt-4 px-10 py-4 bg-white hover:bg-slate-50 text-slate-955 font-semibold rounded-2xl transition-all shadow-lg hover:shadow-white/5 hover:scale-[1.01] active:scale-[0.98] text-base">
                        Get Started Free
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 pt-16 pb-12 text-slate-400 text-xs border-t border-slate-900 relative">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                    {/* Left Column: Logo & Contact Details */}
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center">
                            <img src="/logo.webp" alt="Aao Seekhe Live" className="h-10 opacity-90 invert brightness-200" />
                        </div>
                        
                        {/* Contact Us Block */}
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-350">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] inline-block" />
                                Contact Us
                            </div>
                            
                            <div className="flex flex-col gap-4 text-slate-300">
                                {/* Address */}
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                                        <MapPin size={16} />
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed max-w-sm pt-1">
                                        UGF 24, Arcadium One, Vrindavan Yojana Sector 16, Lucknow, Uttar Pradesh 226029
                                    </p>
                                </div>
                                
                                {/* Phone */}
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-blue-400 flex items-center justify-center shrink-0">
                                        <Phone size={16} />
                                    </div>
                                    <a href="tel:+917307870773" className="text-sm font-semibold hover:text-white transition-colors">
                                        +91 73078 70773
                                    </a>
                                </div>
                                
                                {/* Email */}
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-teal-400 flex items-center justify-center shrink-0">
                                        <Mail size={16} />
                                    </div>
                                    <a href="mailto:info@aaoseekhe.com" className="text-sm font-semibold hover:text-white transition-colors">
                                        info@aaoseekhe.com
                                    </a>
                                </div>
                                
                                {/* Website */}
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-yellow-400 flex items-center justify-center shrink-0">
                                        <Globe size={16} />
                                    </div>
                                    <a href="https://www.aaoseekhe.com" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:text-white transition-colors">
                                        www.aaoseekhe.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column: Platform overview / Links / Description */}
                    <div className="flex flex-col justify-between h-full md:text-right gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-white mb-3">Aao Seekhe Live</h3>
                            <p className="text-slate-400 leading-relaxed text-xs max-w-sm md:ml-auto">
                                An integrated placement preparatory learning management system providing high-fidelity ATS tracking, templates, and speech coaches.
                            </p>
                        </div>
                        <div className="border-t border-slate-900 pt-8 mt-auto">
                            <p className="font-semibold text-slate-500">© 2026 Aao Seekhe Live. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Landing;
