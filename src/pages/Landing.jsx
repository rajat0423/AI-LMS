import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bot, Sparkles, Brain, CheckCircle2, Eye, EyeOff, 
    ArrowRight, Mic, FileText, Zap, ChevronRight, PlayCircle
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
                        setIsSubmitting(true);
                        try {
                            await loginWithGoogle({ credential, year: isSignUp ? Number(selectedYear) : undefined });
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
            } catch (e) { console.error(e); }
        };
        setTimeout(renderGoogle, 100);
        return () => { isMounted = false; };
    }, [isOpen, isSignUp, selectedYear]);

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
        } 
        finally { 
            setIsSubmitting(false); 
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}>
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col pt-16 px-8 relative"
                    onClick={e => e.stopPropagation()}>
                    
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowRight size={20} />
                    </button>

                    <div className="mb-8">
                        <img src="/logo.webp" alt="Aao Seekhe" className="h-8 mb-6" />
                        <h2 className="text-2xl font-bold text-slate-900 font-heading">
                            {isSignUp ? 'Create your account' : 'Welcome back'}
                        </h2>
                        <p className="text-slate-500 text-sm mt-2">
                            {isSignUp ? 'Start mastering your career skills today.' : 'Sign in to jump back into your learning journey.'}
                        </p>
                    </div>

                    <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                        <button type="button" onClick={() => { setIsSignUp(false); setValidationErrors({ name: '', email: '', password: '', year: '' }); setTouched({ name: false, email: false, password: false, year: false }); setErrorMessage(''); }} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Log In</button>
                        <button type="button" onClick={() => { setIsSignUp(true); setValidationErrors({ name: '', email: '', password: '', year: '' }); setTouched({ name: false, email: false, password: false, year: false }); setErrorMessage(''); }} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Sign Up</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                        <AnimatePresence>
                            {isSignUp && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Full Name</label>
                                    <input 
                                        type="text" 
                                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none ${validationErrors.name && touched.name ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} 
                                        placeholder="Lara Croft" 
                                        value={name} 
                                        onChange={(e) => handleFieldChange('name', e.target.value)} 
                                        onBlur={() => handleFieldBlur('name')}
                                        disabled={isSubmitting} 
                                    />
                                    {validationErrors.name && touched.name && (
                                        <p className="text-red-500 text-xs font-semibold mt-1">{validationErrors.name}</p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence>
                            {isSignUp && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Academic Year</label>
                                    <select
                                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none ${validationErrors.year && touched.year ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
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
                                        <p className="text-red-500 text-xs font-semibold mt-1">{validationErrors.year}</p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Email Address</label>
                            <input 
                                type="email" 
                                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none ${validationErrors.email && touched.email ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} 
                                placeholder="you@domain.com" 
                                value={email} 
                                onChange={(e) => handleFieldChange('email', e.target.value)} 
                                onBlur={() => handleFieldBlur('email')}
                                disabled={isSubmitting} 
                            />
                            {validationErrors.email && touched.email && (
                                <p className="text-red-500 text-xs font-semibold mt-1">{validationErrors.email}</p>
                            )}
                        </div>
                        <div className="relative">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Password</label>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className={`w-full pl-4 pr-10 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none ${validationErrors.password && touched.password ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} 
                                placeholder="••••••••" 
                                value={password} 
                                onChange={(e) => handleFieldChange('password', e.target.value)} 
                                onBlur={() => handleFieldBlur('password')}
                                disabled={isSubmitting} 
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[28px] text-slate-400">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            {validationErrors.password && touched.password && (
                                <p className="text-red-500 text-xs font-semibold mt-1">{validationErrors.password}</p>
                            )}
                        </div>

                        {errorMessage && <p className="text-red-500 text-xs font-semibold">{errorMessage}</p>}

                        <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-70 mt-6">
                            {isSubmitting ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                        </button>
                        
                        <div className="relative flex items-center py-4">
                            <div className="flex-grow border-t border-slate-200"></div><span className="shrink-0 mx-4 text-slate-400 text-xs font-semibold">Or</span><div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <div className="flex justify-center w-full"><div ref={googleButtonRef} /></div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ── Landing Page ────────────────────────────────────────────────────────────
function Landing() {
    const [authOpen, setAuthOpen] = useState(false);
    const [authView, setAuthView] = useState('login');

    const openAuth = (view) => {
        setAuthView(view);
        setAuthOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 flex flex-col relative overflow-hidden">
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialView={authView} />
            
            {/* Background blobs */}
            <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[120%] bg-indigo-100 rounded-full blur-[120px] opacity-60 mix-blend-multiply"></div>
                <div className="absolute top-[20%] -left-[10%] w-[50%] h-[100%] bg-violet-100 rounded-full blur-[120px] opacity-60 mix-blend-multiply"></div>
            </div>

            {/* Header */}
            <header className="max-w-7xl mx-auto px-6 h-24 w-full flex items-center justify-between z-10">
                <div className="flex items-center">
                    <img src="/logo.webp" alt="Aao Seekhe Live" className="h-10 w-auto" />
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
                    <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => openAuth('login')} className="text-sm font-bold text-slate-700 hover:text-indigo-600">Log in</button>
                    <button onClick={() => openAuth('signup')} className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">Sign up</button>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-32 flex flex-col lg:flex-row items-center gap-16 z-10">
                <div className="flex-1 text-center lg:text-left">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest rounded-full mb-6 shadow-sm">
                            <Sparkles size={14} className="text-indigo-500" /> Introducing Aao Seekhe Live
                        </div>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 font-heading leading-[1.1] mb-6 tracking-tight">
                            Your personal <br className="hidden lg:block"/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">career accelerator.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Master interviews, optimize resumes, and craft perfect emails with real-time AI feedback. Stop guessing and start landing offers.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <button onClick={() => openAuth('signup')} className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 text-lg active:scale-95">
                                Get Started <ArrowRight size={20} />
                            </button>
                        </div>
                        <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 font-medium">
                            <p>Begin your learning journey today.</p>
                        </div>
                    </motion.div>
                </div>
                
                {/* Hero Visual */}
                <div className="flex-1 w-full max-w-lg lg:max-w-none relative perspective-1000">
                    <motion.div initial={{ opacity: 0, rotateY: 10, rotateX: 10, scale: 0.9 }} animate={{ opacity: 1, rotateY: 0, rotateX: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative z-10 glass-panel rounded-3xl p-6 md:p-8 overflow-hidden transform-gpu border-white/60">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 -z-10"></div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                <Bot size={24} className="text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">AI Interview Feedback</h3>
                                <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-1">Live Processing</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-white/60 rounded-2xl border border-white/50 backdrop-blur-md shadow-sm">
                                <p className="text-sm font-semibold text-slate-700">"Tell me about a time you failed."</p>
                            </div>
                            <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 ml-8 relative">
                                <span className="absolute -left-3 top-4 w-3 h-3 bg-indigo-600 rotate-45"></span>
                                <p className="text-sm">I once missed a deadline because I underestimated the scope. I communicated early with stakeholders and learned to buffer time."</p>
                            </div>
                            <div className="p-4 bg-white/80 rounded-2xl border border-indigo-100 backdrop-blur-md shadow-md mr-8">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={14} className="text-amber-500 fill-amber-500" />
                                    <span className="text-xs font-bold text-slate-800">Feedback</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">Strong STAR method structuring. Great that you focused on the learning outcome, showing accountability.</p>
                            </div>
                        </div>
                    </motion.div>
                    {/* Decorative elements */}
                    <div className="absolute top-1/2 -right-8 w-24 h-24 bg-rose-400 rounded-full blur-[40px] opacity-20 -z-20"></div>
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-400 rounded-full blur-[50px] opacity-30 -z-20"></div>
                </div>
            </main>

            {/* Features Bento Grid */}
            <section id="features" className="bg-white py-24 border-t border-slate-100 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 font-heading mb-6 tracking-tight">An entire career center <br/> in your browser.</h2>
                        <p className="text-lg text-slate-500">Everything you need to step confidently into your next big role. Powered by models built specifically for professional growth.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Big Card */}
                        <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden group">
                            <div className="absolute right-0 bottom-0 w-96 h-96 bg-indigo-500/20 blur-3xl rounded-full group-hover:scale-110 transition-transform duration-700"></div>
                            <div className="relative z-10">
                                <Bot size={32} className="text-indigo-400 mb-6" />
                                <h3 className="text-3xl font-bold mb-4">AI Mock Interviews</h3>
                                <p className="text-slate-400 text-lg max-w-md mb-8">Practice technical and behavioral mock interviews. Our AI provides instant feedback on your answers and suggests improvements.</p>
                                <button onClick={() => openAuth('signup')} className="text-sm font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2 hover:text-indigo-300 transition-colors">
                                    Try it now <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                        {/* Tall Card */}
                        <div className="bg-indigo-50 rounded-[2rem] p-8 md:p-10 border border-indigo-100 relative overflow-hidden group">
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <FileText size={32} className="text-indigo-600 mb-6" />
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Resume Analyzer</h3>
                                    <p className="text-slate-600">Upload your PDF resume and a target job description. Instantly receive an ATS score and keyword gaps.</p>
                                </div>
                                <div className="mt-8 font-heading text-5xl font-extrabold text-slate-300">ATS</div>
                            </div>
                        </div>
                        {/* Small Card 1 */}
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <Brain size={28} className="text-violet-600 mb-5" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Employability Analytics</h3>
                            <p className="text-slate-500 text-sm">Track your progress and receive dynamic insights on communication and confidence levels.</p>
                        </div>
                        {/* Small Card 2 */}
                        <div className="md:col-span-2 bg-rose-50 rounded-[2rem] p-8 border border-rose-100 flex flex-col sm:flex-row items-center gap-8">
                            <div className="flex-1">
                                <Sparkles size={28} className="text-rose-600 mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Email & Blog Writers</h3>
                                <p className="text-slate-600">Draft professional emails, follow-ups, and thought-leadership blog posts instantly.</p>
                            </div>
                            <div className="w-full sm:w-64 h-32 bg-white rounded-xl shadow-sm border border-white flex items-center justify-center text-slate-300 font-medium p-4 text-xs italic">
                                "Hi Team, thanks for the great interview today..."
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 py-12 text-center text-slate-400 text-sm">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center">
                        <img src="/logo.webp" alt="Aao Seekhe Live" className="h-8 opacity-80 invert brightness-200" />
                    </div>
                    <p>© 2026 Aao Seekhe Live. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

export default Landing;
